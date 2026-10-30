import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateSlot, normalizePhone, slotsFor, arenaNow, totalCents, MAX_SLOTS } from "./arena-rules";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomCode(len: number, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Fixed-window rate limit stored in the database (workers are stateless). */
async function rateLimit(key: string, max: number, windowSec: number) {
  const db = await admin();
  const { data } = await db.from("rate_limits").select("*").eq("key", key).maybeSingle();
  const now = Date.now();
  if (!data || now - new Date(data.window_start).getTime() > windowSec * 1000) {
    await db.from("rate_limits").upsert({ key, count: 1, window_start: new Date().toISOString() });
    return true;
  }
  if (data.count >= max) return false;
  await db.from("rate_limits").update({ count: data.count + 1 }).eq("key", key);
  return true;
}
async function clientKey() {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "anon").split(",")[0]!.trim();
}
async function audit(actor: string, action: string, entity?: string, entity_id?: string, details?: Record<string, unknown>) {
  const db = await admin();
  await db.from("audit_logs").insert({ actor, action, entity: entity ?? null, entity_id: entity_id ?? null, details: (details ?? null) as never });
}

/* ---------------- Público ---------------- */

export const getSpaces = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("arena_spaces").select("id,name,sport,capacity,slot_minutes,price_cents,active").order("sort_order");
  if (error) throw new Error("Não foi possível carregar os espaços.");
  return data;
});

/** Retorna somente ocupação (sem dados pessoais). */
export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator(z.object({ spaceId: z.string().max(40), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows } = await db
      .from("bookings")
      .select("start_time,payment_status")
      .eq("space_id", data.spaceId)
      .eq("booking_date", data.date)
      .in("payment_status", ["pending", "paid"]);
    const taken = new Map((rows ?? []).map((r) => [r.start_time.slice(0, 5), r.payment_status]));
    return slotsFor(data.date).map((s) => {
      const st = taken.get(s.start);
      const v = validateSlot(data.date, s.start);
      return { ...s, status: st === "paid" ? "confirmed" : st === "pending" ? "pending" : v.ok ? "available" : "unavailable" } as const;
    });
  });

const bookingSchema = z.object({
  spaceId: z.string().min(1).max(40),
  date: z.string(),
  starts: z.array(z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.")).min(1, "Escolha ao menos um horário.").max(MAX_SLOTS, `Escolha até ${MAX_SLOTS} horários.`),
  name: z.string().trim().min(3, "Informe o nome completo.").max(80),
  phone: z.string().max(30),
  method: z.enum(["pix", "card_onsite", "cash_onsite"]),
  idempotencyKey: z.string().uuid(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(bookingSchema)
  .handler(async ({ data }) => {
    const db = await admin();
    // Idempotência: mesma chave devolve a mesma reserva
    const { data: existing } = await db.from("bookings").select("group_code").eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (existing) return getPublicBooking(existing.group_code);

    if (!(await rateLimit(`book:${await clientKey()}`, 10, 600))) return { ok: false as const, error: "Muitas tentativas. Aguarde alguns minutos." };

    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false as const, error: "WhatsApp inválido. Use DDD + número." };
    const name = data.name.replace(/[<>]/g, "");

    // Same slot picked twice is a click mistake, not a second reservation.
    const starts = [...new Set(data.starts)].sort();
    const slots: Array<{ start: string; end: string }> = [];
    for (const s of starts) {
      const v = validateSlot(data.date, s);
      if (!v.ok) return { ok: false as const, error: v.reason };
      slots.push({ start: s, end: v.end });
    }

    const { data: space } = await db.from("arena_spaces").select("id,price_cents,active").eq("id", data.spaceId).maybeSingle();
    if (!space || !space.active) return { ok: false as const, error: "Espaço inexistente ou indisponível." };

    // Tell the customer which times are gone before any payment is generated.
    const { data: taken } = await db
      .from("bookings").select("start_time")
      .eq("space_id", space.id).eq("booking_date", data.date).in("start_time", starts).in("payment_status", ["pending", "paid"]);
    if (taken?.length) {
      return { ok: false as const, error: `Estes horários já foram reservados: ${taken.map((t) => String(t.start_time).slice(0, 5)).join(", ")}.` };
    }

    const code = `AE-${randomCode(6)}`;
    const expires = data.method === "pix" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
    const rows = slots.map((s) => ({
      booking_code: slots.length === 1 ? code : `${code}-${s.start.replace(":", "")}`,
      group_code: code,
      idempotency_key: data.idempotencyKey,
      space_id: space.id, booking_date: data.date, start_time: s.start, end_time: s.end,
      customer_name: name, phone, payment_method: data.method, amount_cents: space.price_cents, expires_at: expires,
    }));
    const { data: inserted, error } = await db.from("bookings").insert(rows).select("id");
    if (error || !inserted?.length) {
      if (error?.code === "23P01" || error?.code === "23505") return { ok: false as const, error: "Um dos horários acabou de ser reservado. Escolha outro." };
      console.error("booking insert failed", error?.code);
      return { ok: false as const, error: "Não foi possível concluir a reserva." };
    }

    // One charge (and one QR Code) covers the whole reservation.
    const amount = totalCents(space.price_cents, slots.length);
    const { createPixCharge } = await import("./payments.server");
    const pix = data.method === "pix" ? await createPixCharge({ code, amountCents: amount }) : null;
    await db.from("payments").insert(inserted.map((r) => ({
      booking_id: r.id, method: data.method, amount_cents: space.price_cents,
      provider: pix?.provider ?? "onsite", provider_ref: pix?.ref ?? null,
      is_simulated: pix?.simulated ?? false, pix_payload: pix?.payload ?? null,
    })));
    await audit("public", "booking.create", "booking", inserted[0]!.id, { code, slots: slots.length });
    return getPublicBooking(code);
  });

async function getPublicBooking(code: string) {
  const db = await admin();
  const { data } = await db
    .from("bookings")
    .select("group_code,booking_date,start_time,end_time,payment_method,payment_status,amount_cents,expires_at,customer_name,arena_spaces(name),payments(pix_payload,is_simulated)")
    .eq("group_code", code)
    .order("start_time");
  if (!data?.length) return { ok: false as const, error: "Reserva não encontrada." };
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const pay = (first.payments as Array<{ pix_payload: string | null; is_simulated: boolean }> | null)?.[0];
  return {
    ok: true as const,
    booking: {
      code: first.group_code, date: first.booking_date, start: first.start_time.slice(0, 5), end: last.end_time.slice(0, 5),
      slots: data.map((r) => ({ start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) })),
      method: first.payment_method, status: first.payment_status, amount: data.reduce((s, r) => s + r.amount_cents, 0),
      expiresAt: first.expires_at, firstName: first.customer_name.split(" ")[0],
      space: (first.arena_spaces as { name: string } | null)?.name ?? "",
      pixPayload: pay?.pix_payload ?? null, pixSimulated: pay?.is_simulated ?? false,
    },
  };
}

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().trim().min(3).max(80), phone: z.string().max(30), type: z.enum(["access", "deletion", "correction"]), message: z.string().max(1000).optional() }))
  .handler(async ({ data }) => {
    if (!(await rateLimit(`privacy:${await clientKey()}`, 5, 3600))) return { ok: false, error: "Muitas solicitações." };
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, error: "WhatsApp inválido." };
    const db = await admin();
    await db.from("privacy_requests").insert({ name: data.name, phone, request_type: data.type, message: data.message ?? null });
    return { ok: true, error: null };
  });

/* ---------------- Admin ---------------- */

const COOKIE = "ae_admin";
const SESSION_HOURS = 8;

async function requireAdmin() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(COOKIE);
  if (!token) throw new Error("UNAUTHORIZED");
  const db = await admin();
  const { data } = await db.from("admin_sessions").select("id,expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) throw new Error("UNAUTHORIZED");
  return data.id;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    if (!(await rateLimit(`login:${await clientKey()}`, 5, 900))) return { ok: false, error: "Muitas tentativas. Tente novamente em 15 minutos." };
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) return { ok: false, error: "Acesso indisponível." };
    const [a, b] = await Promise.all([sha256(data.password), sha256(expected)]);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    if (diff !== 0) {
      await audit("anon", "admin.login_failed");
      return { ok: false, error: "Credenciais inválidas." };
    }
    const token = randomCode(48, "abcdefghijklmnopqrstuvwxyz0123456789");
    const db = await admin();
    await db.from("admin_sessions").insert({ token_hash: await sha256(token), expires_at: new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString() });
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: SESSION_HOURS * 3600 });
    await audit("admin", "admin.login");
    return { ok: true, error: null };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(COOKIE);
  if (token) {
    const db = await admin();
    await db.from("admin_sessions").delete().eq("token_hash", await sha256(token));
  }
  deleteCookie(COOKIE, { path: "/", secure: true, sameSite: "none" });
  return { ok: true };
});

export const adminCheck = createServerFn({ method: "GET" }).handler(async () => {
  try { await requireAdmin(); return { authed: true }; } catch { return { authed: false }; }
});

export const adminDay = createServerFn({ method: "GET" })
  .inputValidator(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    // Expira Pix pendentes vencidos
    await db.from("bookings").update({ payment_status: "expired", updated_at: new Date().toISOString() })
      .eq("payment_status", "pending").eq("payment_method", "pix").lt("expires_at", new Date().toISOString());
    const [{ data: rows }, { data: spaces }] = await Promise.all([
      db.from("bookings").select("id,booking_code,group_code,booking_date,start_time,end_time,customer_name,phone,payment_method,payment_status,amount_cents,notes,space_id,created_at")
        .eq("booking_date", data.date).order("start_time"),
      db.from("arena_spaces").select("id,name").order("sort_order"),
    ]);
    return { bookings: rows ?? [], spaces: spaces ?? [], slotsPerSpace: slotsFor(data.date).length };
  });

export const adminPending = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const nowIso = new Date().toISOString();
  await db.from("bookings").update({ payment_status: "expired", updated_at: nowIso })
    .eq("payment_status", "pending").eq("payment_method", "pix").lt("expires_at", nowIso);
  const { data: rows } = await db.from("bookings")
    .select("id,booking_code,group_code,booking_date,start_time,customer_name,payment_method,amount_cents,space_id,arena_spaces(name)")
    .eq("payment_status", "pending").gte("booking_date", arenaNow().date)
    .order("booking_date").order("start_time").limit(100);
  return (rows ?? []).map((r) => ({ ...r, space_name: (r.arena_spaces as { name: string } | null)?.name ?? r.space_id }));
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), action: z.enum(["mark_paid", "cancel", "note"]), note: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const now = new Date().toISOString();
    const { data: b } = await db.from("bookings").select("payment_method,payment_status,group_code").eq("id", data.id).single();
    if (!b) return { ok: false, error: "Reserva não encontrada." };
    if (data.action === "mark_paid") {
      // Confirmação manual pelo administrador (ex.: conferiu o Pix no banco ou recebeu no local)
      if (b.payment_status !== "pending") return { ok: false, error: "Reserva não está pendente." };
      // Um só Pix cobre todos os horários da mesma reserva.
      const { data: group } = await db.from("bookings").select("id").eq("group_code", b.group_code).eq("payment_status", "pending");
      const ids = (group ?? []).map((g) => g.id);
      const target = ids.length ? ids : [data.id];
      await db.from("bookings").update({ payment_status: "paid", updated_at: now }).in("id", target);
      await db.from("payments").update({ status: "paid", paid_at: now, updated_at: now }).in("booking_id", target);
    } else if (data.action === "cancel") {
      await db.from("bookings").update({ payment_status: "cancelled", cancelled_at: now, updated_at: now }).eq("id", data.id);
      await db.from("payments").update({ status: "cancelled", updated_at: now }).eq("booking_id", data.id);
    } else {
      await db.from("bookings").update({ notes: (data.note ?? "").replace(/[<>]/g, ""), updated_at: now }).eq("id", data.id);
    }
    await audit("admin", `booking.${data.action}`, "booking", data.id);
    return { ok: true, error: null };
  });
