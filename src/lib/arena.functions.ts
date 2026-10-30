import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateSlot, normalizePhone, slotsFor, arenaNow, totalCents, MAX_SLOTS } from "./arena-rules";

type SpaceRow = { id: string; name: string; sport: string; capacity: number; slot_minutes: number; price_cents: number; active: boolean };
type AvailabilityRow = { start_time: string; payment_status: string };
type GroupCodeRow = { group_code: string };
type SpacePriceRow = { id: string; price_cents: number };
type OccupiedRow = { start_time: string };
type InsertedBookingRow = { id: string };
type PublicBookingRow = {
  group_code: string; booking_date: string; start_time: string; end_time: string;
  payment_method: string; payment_status: string; amount_cents: number; expires_at: string | null;
  customer_name: string; space_name: string | null; pix_payload: string | null; is_simulated: boolean | null;
};
type AdminSessionRow = { id: string };
type BookingAdminRow = {
  id: string; booking_code: string; group_code: string; booking_date: string; start_time: string; end_time: string;
  customer_name: string; phone: string; payment_method: string; payment_status: string; amount_cents: number;
  notes: string | null; space_id: string; created_at: string;
};
type AdminSpaceRow = { id: string; name: string };
type BookingPendingRow = {
  id: string; booking_code: string; group_code: string; booking_date: string; start_time: string;
  customer_name: string; payment_method: string; amount_cents: number; space_id: string; space_name: string | null;
};
type LockedBookingRow = { payment_method: string; payment_status: string; group_code: string };

const database = async () => (await import("./db.server")).getDb();

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomCode(len: number, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
}

/** Fixed-window rate limit stored atomically in the database (workers are stateless). */
async function rateLimit(key: string, max: number, windowSec: number) {
  const db = await database();
  const rows = await db`
    WITH attempt AS (
      INSERT INTO public.rate_limits (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN public.rate_limits.window_start <= now() - make_interval(secs => ${windowSec}) THEN 1
          ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start <= now() - make_interval(secs => ${windowSec}) THEN now()
          ELSE public.rate_limits.window_start
        END
      WHERE public.rate_limits.window_start <= now() - make_interval(secs => ${windowSec})
         OR public.rate_limits.count < ${max}
      RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM attempt) AS allowed
  `;
  return Boolean(rows[0]?.["allowed"]);
}
async function clientKey() {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "anon").split(",")[0]!.trim();
}
async function audit(actor: string, action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
  const db = await database();
  await db`
    INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
    VALUES (${actor}, ${action}, ${entity ?? null}, ${entityId ?? null}, ${details ? JSON.stringify(details) : null}::jsonb)
  `;
}

/* ---------------- Público ---------------- */

const SPACE_CACHE_TTL_MS = 30_000;
let spacesCache: { rows: SpaceRow[]; expiresAt: number } | undefined;
let spacesPending: Promise<SpaceRow[]> | undefined;

export const getSpaces = createServerFn({ method: "GET" }).handler(async () => {
  if (spacesCache && spacesCache.expiresAt > Date.now()) return spacesCache.rows;
  const pending = spacesPending ?? (spacesPending = (async () => {
    const db = await database();
    const rows = (await db`
      SELECT id, name, sport, capacity, slot_minutes, price_cents, active
      FROM public.arena_spaces ORDER BY sort_order
    `) as unknown as SpaceRow[];
    spacesCache = { rows, expiresAt: Date.now() + SPACE_CACHE_TTL_MS };
    return rows;
  })());
  try {
    return await pending;
  } finally {
    if (spacesPending === pending) spacesPending = undefined;
  }
});

/** Retorna somente ocupação (sem dados pessoais). */
export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator(z.object({ spaceId: z.string().max(40), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    const db = await database();
    const rows = (await db`
      SELECT to_char(start_time, 'HH24:MI') AS start_time, payment_status
      FROM public.bookings
      WHERE space_id = ${data.spaceId} AND booking_date = ${data.date}::date
        AND payment_status IN ('pending', 'paid')
    `) as unknown as AvailabilityRow[];
    const taken = new Map(rows.map((r) => [String(r.start_time), String(r.payment_status)]));
    return slotsFor(data.date).map((s) => {
      const status = taken.get(s.start);
      const valid = validateSlot(data.date, s.start);
      return { ...s, status: status === "paid" ? "confirmed" : status === "pending" ? "pending" : valid.ok ? "available" : "unavailable" } as const;
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
    const db = await database();
    // Idempotência: mesma chave devolve a mesma reserva, antes de consumir rate limit.
    const previous = (await db`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
    if (previous[0]) return getPublicBooking(String(previous[0].group_code));

    if (!(await rateLimit(`book:${await clientKey()}`, 10, 600))) return { ok: false as const, error: "Muitas tentativas. Aguarde alguns minutos." };

    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false as const, error: "WhatsApp inválido. Use DDD + número." };
    const name = data.name.replace(/[<>]/g, "");

    // Same slot picked twice is a click mistake, not a second reservation.
    const starts = [...new Set(data.starts)].sort();
    const slots: Array<{ start: string; end: string }> = [];
    for (const start of starts) {
      const valid = validateSlot(data.date, start);
      if (!valid.ok) return { ok: false as const, error: valid.reason };
      slots.push({ start, end: valid.end });
    }

    const code = `AE-${randomCode(6)}`;
    const expires = data.method === "pix" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
    try {
      const outcome = await db.begin(async (tx) => {
        const previousInTransaction = (await tx`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
        if (previousInTransaction[0]) return { code: String(previousInTransaction[0].group_code), error: null as string | null };

        const spaces = (await tx`
          SELECT id, price_cents FROM public.arena_spaces
          WHERE id = ${data.spaceId} AND active = true FOR SHARE
        `) as unknown as SpacePriceRow[];
        const space = spaces[0];
        if (!space) return { code: null, error: "Espaço inexistente ou indisponível." };

        // Give the customer a clear response before creating a payment; the exclusion
        // constraint remains the final protection against concurrent reservations.
        const occupied = (await tx`
          SELECT to_char(start_time, 'HH24:MI') AS start_time
          FROM public.bookings
          WHERE space_id = ${space.id} AND booking_date = ${data.date}::date
            AND payment_status IN ('pending', 'paid')
        `) as unknown as OccupiedRow[];
        const taken = occupied.filter((row) => starts.includes(String(row.start_time)));
        if (taken.length) {
          const times = taken.map((row) => String(row.start_time)).join(", ");
          return { code: null, error: `Estes horários já foram reservados: ${times}.` };
        }

        const inserted: Array<{ id: string }> = [];
        for (const [index, slot] of slots.entries()) {
          // The legacy schema has a unique idempotency_key per booking row. Keep the
          // request key on the first row and deterministic suffixes on the rest.
          const rowKey = index === 0 ? data.idempotencyKey : `${data.idempotencyKey}:${index}`;
          const bookingCode = slots.length === 1 ? code : `${code}-${slot.start.replace(":", "")}`;
          const rows = (await tx`
            INSERT INTO public.bookings (
              booking_code, group_code, idempotency_key, space_id, booking_date,
              start_time, end_time, customer_name, phone, payment_method,
              amount_cents, expires_at
            ) VALUES (
              ${bookingCode}, ${code}, ${rowKey}, ${space.id}, ${data.date}::date,
              ${slot.start}::time, ${slot.end}::time, ${name}, ${phone}, ${data.method},
              ${space.price_cents}, ${expires}::timestamptz
            ) RETURNING id
          `) as unknown as InsertedBookingRow[];
          if (rows[0]) inserted.push({ id: String(rows[0].id) });
        }

        // One charge (and one QR Code) covers the whole reservation. It is created
        // within this transaction so the payment and all booking rows commit together.
        const amount = totalCents(Number(space.price_cents), slots.length);
        const { createPixCharge } = await import("./payments.server");
        const pix = data.method === "pix" ? await createPixCharge({ code, amountCents: amount }) : null;
        for (const [index, booking] of inserted.entries()) {
          // provider_ref is unique in the existing schema; one charge belongs to the
          // first row, while the remaining rows retain their per-slot payment state.
          await tx`
            INSERT INTO public.payments (
              booking_id, method, amount_cents, provider, provider_ref,
              is_simulated, pix_payload
            ) VALUES (
              ${booking.id}::uuid, ${data.method}, ${space.price_cents},
              ${pix?.provider ?? "onsite"}, ${index === 0 ? pix?.ref ?? null : null},
              ${pix?.simulated ?? false}, ${index === 0 ? pix?.payload ?? null : null}
            )
          `;
        }
        await tx`
          INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
          VALUES ('public', 'booking.create', 'booking', ${inserted[0]?.id ?? null}, ${JSON.stringify({ code, slots: slots.length })}::jsonb)
        `;
        return { code, error: null as string | null };
      });

      if (outcome.error) return { ok: false as const, error: outcome.error };
      return getPublicBooking(String(outcome.code));
    } catch (error) {
      const codeFromError = errorCode(error);
      if (codeFromError === "23505") {
        // A concurrent retry may have committed the same idempotency key.
        const previousAfterConflict = (await db`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
        if (previousAfterConflict[0]) return getPublicBooking(String(previousAfterConflict[0].group_code));
      }
      if (codeFromError === "23P01" || codeFromError === "23505") {
        return { ok: false as const, error: "Um dos horários acabou de ser reservado. Escolha outro." };
      }
      console.error("booking insert failed", codeFromError);
      return { ok: false as const, error: "Não foi possível concluir a reserva." };
    }
  });

async function getPublicBooking(code: string) {
  const db = await database();
  const rows = (await db`
    SELECT
      b.group_code, b.booking_date::text AS booking_date,
      to_char(b.start_time, 'HH24:MI') AS start_time,
      to_char(b.end_time, 'HH24:MI') AS end_time,
      b.payment_method, b.payment_status, b.amount_cents, b.expires_at::text AS expires_at,
      b.customer_name, s.name AS space_name, p.pix_payload, p.is_simulated
    FROM public.bookings b
    LEFT JOIN public.arena_spaces s ON s.id = b.space_id
    LEFT JOIN LATERAL (
      SELECT pix_payload, is_simulated FROM public.payments
      WHERE booking_id = b.id ORDER BY created_at LIMIT 1
    ) p ON true
    WHERE b.group_code = ${code}
    ORDER BY b.start_time
  `) as unknown as PublicBookingRow[];
  if (!rows.length) return { ok: false as const, error: "Reserva não encontrada." };
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  return {
    ok: true as const,
    booking: {
      code: String(first.group_code), date: String(first.booking_date), start: String(first.start_time), end: String(last.end_time),
      slots: rows.map((row) => ({ start: String(row.start_time), end: String(row.end_time) })),
      method: first.payment_method, status: first.payment_status,
      amount: rows.reduce((sum, row) => sum + Number(row.amount_cents), 0),
      expiresAt: first.expires_at, firstName: String(first.customer_name).split(" ")[0],
      space: String(first.space_name ?? ""), pixPayload: first.pix_payload ?? null,
      pixSimulated: Boolean(first.is_simulated ?? false),
    },
  };
}

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().trim().min(3).max(80), phone: z.string().max(30), type: z.enum(["access", "deletion", "correction"]), message: z.string().max(1000).optional() }))
  .handler(async ({ data }) => {
    if (!(await rateLimit(`privacy:${await clientKey()}`, 5, 3600))) return { ok: false, error: "Muitas solicitações." };
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, error: "WhatsApp inválido." };
    const db = await database();
    await db`
      INSERT INTO public.privacy_requests (name, phone, request_type, message)
      VALUES (${data.name}, ${phone}, ${data.type}, ${data.message ?? null})
    `;
    return { ok: true, error: null };
  });

/* ---------------- Admin ---------------- */

const COOKIE = "ae_admin";
const SESSION_HOURS = 8;

async function requireAdmin() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(COOKIE);
  if (!token) throw new Error("UNAUTHORIZED");
  const db = await database();
  const rows = (await db`
    SELECT id FROM public.admin_sessions
    WHERE token_hash = ${await sha256(token)} AND expires_at > now()
    LIMIT 1
  `) as unknown as AdminSessionRow[];
  if (!rows[0]) throw new Error("UNAUTHORIZED");
  return rows[0].id;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    if (!(await rateLimit(`login:${await clientKey()}`, 5, 900))) return { ok: false, error: "Muitas tentativas. Tente novamente em 15 minutos." };
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) return { ok: false, error: "Acesso indisponível." };
    const [actualHash, expectedHash] = await Promise.all([sha256(data.password), sha256(expected)]);
    let diff = 0;
    for (let i = 0; i < actualHash.length; i++) diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    if (diff !== 0) {
      await audit("anon", "admin.login_failed");
      return { ok: false, error: "Credenciais inválidas." };
    }
    const token = randomCode(48, "abcdefghijklmnopqrstuvwxyz0123456789");
    const db = await database();
    await db`
      INSERT INTO public.admin_sessions (token_hash, expires_at)
      VALUES (${await sha256(token)}, ${new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString()}::timestamptz)
    `;
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: SESSION_HOURS * 3600 });
    await audit("admin", "admin.login");
    return { ok: true, error: null };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(COOKIE);
  if (token) {
    const db = await database();
    await db`DELETE FROM public.admin_sessions WHERE token_hash = ${await sha256(token)}`;
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
    const db = await database();
    // Expira Pix pendentes vencidos.
    await db`
      UPDATE public.bookings SET payment_status = 'expired', updated_at = now()
      WHERE payment_status = 'pending' AND payment_method = 'pix' AND expires_at < now()
    `;
    const [bookingRows, spaceRows] = await Promise.all([
      db`
        SELECT id, booking_code, group_code, booking_date::text AS booking_date,
          to_char(start_time, 'HH24:MI:SS') AS start_time, to_char(end_time, 'HH24:MI:SS') AS end_time,
          customer_name, phone, payment_method, payment_status, amount_cents, notes,
          space_id, created_at::text AS created_at
        FROM public.bookings WHERE booking_date = ${data.date}::date ORDER BY start_time
      `,
      db`SELECT id, name FROM public.arena_spaces ORDER BY sort_order`,
    ]);
    const bookings = bookingRows as unknown as BookingAdminRow[];
    const spaces = spaceRows as unknown as AdminSpaceRow[];
    return { bookings, spaces, slotsPerSpace: slotsFor(data.date).length };
  });

export const adminPending = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await database();
  await db`
    UPDATE public.bookings SET payment_status = 'expired', updated_at = now()
    WHERE payment_status = 'pending' AND payment_method = 'pix' AND expires_at < now()
  `;
  const rows = (await db`
    SELECT b.id, b.booking_code, b.group_code, b.booking_date::text AS booking_date,
      to_char(b.start_time, 'HH24:MI:SS') AS start_time, b.customer_name,
      b.payment_method, b.amount_cents, b.space_id, s.name AS space_name
    FROM public.bookings b LEFT JOIN public.arena_spaces s ON s.id = b.space_id
    WHERE b.payment_status = 'pending' AND b.booking_date >= ${arenaNow().date}::date
    ORDER BY b.booking_date, b.start_time LIMIT 100
  `) as unknown as BookingPendingRow[];
  return rows.map((row) => ({
    ...row,
    arena_spaces: row.space_name ? { name: row.space_name } : null,
    space_name: row.space_name ?? row.space_id,
  }));
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), action: z.enum(["mark_paid", "cancel", "note"]), note: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    const now = new Date().toISOString();
    const result = await db.begin(async (tx) => {
      const bookings = (await tx`
        SELECT payment_method, payment_status, group_code
        FROM public.bookings WHERE id = ${data.id}::uuid FOR UPDATE
      `) as unknown as LockedBookingRow[];
      const booking = bookings[0];
      if (!booking) return { ok: false, error: "Reserva não encontrada." };

      if (data.action === "mark_paid") {
        // Confirmação manual pelo administrador; um Pix pode cobrir todo o grupo.
        if (booking.payment_status !== "pending") return { ok: false, error: "Reserva não está pendente." };
        await tx`
          SELECT id FROM public.bookings
          WHERE group_code = ${booking.group_code} AND payment_status = 'pending'
          ORDER BY id FOR UPDATE
        `;
        await tx`
          UPDATE public.bookings SET payment_status = 'paid', updated_at = ${now}::timestamptz
          WHERE group_code = ${booking.group_code} AND payment_status = 'pending'
        `;
        await tx`
          UPDATE public.payments SET status = 'paid', paid_at = ${now}::timestamptz, updated_at = ${now}::timestamptz
          WHERE booking_id IN (
            SELECT id FROM public.bookings WHERE group_code = ${booking.group_code} AND payment_status = 'paid'
          )
        `;
      } else if (data.action === "cancel") {
        await tx`
          UPDATE public.bookings
          SET payment_status = 'cancelled', cancelled_at = ${now}::timestamptz, updated_at = ${now}::timestamptz
          WHERE id = ${data.id}::uuid
        `;
        await tx`
          UPDATE public.payments SET status = 'cancelled', updated_at = ${now}::timestamptz
          WHERE booking_id = ${data.id}::uuid
        `;
      } else {
        await tx`
          UPDATE public.bookings SET notes = ${((data.note ?? "").replace(/[<>]/g, ""))}, updated_at = ${now}::timestamptz
          WHERE id = ${data.id}::uuid
        `;
      }
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id)
        VALUES ('admin', ${`booking.${data.action}`}, 'booking', ${data.id})
      `;
      return { ok: true, error: null };
    });
    return result;
  });
