import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  validateSlot,
  normalizePhone,
  slotsFor,
  arenaNow,
  totalCents,
  MAX_SLOTS,
  weekdayOf,
  toMin,
  validateOpeningWindows,
  type OpeningWindow,
} from "./arena-rules";
import { tournamentRegistrationSchema } from "./tournament-schema";
import { TOURNAMENT } from "./site";

type SpaceRow = {
  id: string;
  name: string;
  sport: string;
  capacity: number | null;
  slot_minutes: number;
  price_cents: number | null;
  active: boolean;
  unit_id: string;
};
type AvailabilityRow = { start_time: string; end_time: string; payment_status: string };
type GroupCodeRow = { group_code: string };
type SpacePriceRow = {
  id: string;
  price_cents: number | null;
  slot_minutes: number;
  unit_id: string;
};
type OccupiedRow = { start_time: string };
type HoursRow = { windows: unknown };
type InsertedBookingRow = { id: string };
type PublicBookingRow = {
  group_code: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  payment_method: string;
  payment_status: string;
  amount_cents: number;
  expires_at: string | null;
  customer_name: string;
  space_name: string | null;
  pix_payload: string | null;
  is_simulated: boolean | null;
};
type AdminSessionRow = { id: string };
type BookingAdminRow = {
  id: string;
  booking_code: string;
  group_code: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  phone: string;
  payment_method: string;
  payment_status: string;
  amount_cents: number;
  notes: string | null;
  space_id: string;
  created_at: string;
};
type AdminSpaceRow = { id: string; name: string };
type BookingPendingRow = {
  id: string;
  booking_code: string;
  group_code: string;
  booking_date: string;
  start_time: string;
  customer_name: string;
  payment_method: string;
  amount_cents: number;
  space_id: string;
  space_name: string | null;
};
type LockedBookingRow = { payment_method: string; payment_status: string; group_code: string };

const database = async () => (await import("./db.server")).getDb();

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function randomCode(len: number, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
}
function errorConstraint(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const fields = error as Record<string, unknown>;
  const constraint = fields["constraint_name"] ?? fields["constraint"] ?? fields["constraintName"];
  return typeof constraint === "string" && /^[a-z0-9_]+$/i.test(constraint)
    ? constraint
    : undefined;
}

function normalizeWindows(value: unknown): OpeningWindow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const start = typeof row["start"] === "string" ? row["start"] : "";
    const end = typeof row["end"] === "string" ? row["end"] : "";
    return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && toMin(end) > toMin(start)
      ? [{ start, end }]
      : [];
  });
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
  return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "anon")
    .split(",")[0]!
    .trim();
}
async function audit(
  actor: string,
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
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
  const pending =
    spacesPending ??
    (spacesPending = (async () => {
      const db = await database();
      const rows = (await db`
      SELECT id, name, sport, capacity, slot_minutes, price_cents, active, unit_id
      FROM public.arena_spaces
      WHERE unit_id IS NOT NULL AND active = true AND price_cents > 0
      ORDER BY sort_order
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

/** Publica apenas datas cujo dia da semana tem pelo menos uma janela configurada. */
export const getPublicBookingDates = createServerFn({ method: "GET" })
  .inputValidator(z.object({ unitId: z.enum(["unidade-1", "unidade-2"]) }))
  .handler(async ({ data }) => {
    const db = await database();
    const rows = (await db`
      SELECT weekday, windows FROM public.arena_weekly_hours
      WHERE unit_id = ${data.unitId}
    `) as unknown as Array<{ weekday: number; windows: unknown }>;
    const openDays = new Set(
      rows
        .filter((row) => normalizeWindows(row.windows).length > 0)
        .map((row) => Number(row.weekday)),
    );
    const today = arenaNow().date;
    const base = new Date(`${today}T12:00:00Z`);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(base);
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    }).filter((date) => openDays.has(weekdayOf(date)));
  });

/** Retorna somente ocupação (sem dados pessoais). */
export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({ spaceId: z.string().max(40), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  )
  .handler(async ({ data }) => {
    const db = await database();
    const spaces = (await db`
      SELECT id, unit_id, slot_minutes FROM public.arena_spaces
      WHERE id = ${data.spaceId} AND active = true AND price_cents > 0 AND unit_id IS NOT NULL
      LIMIT 1
    `) as unknown as Array<{ id: string; unit_id: string; slot_minutes: number }>;
    const space = spaces[0];
    if (!space) return [];
    const [rows, hoursRows] = await Promise.all([
      db`
      SELECT to_char(start_time, 'HH24:MI') AS start_time,
        to_char(end_time, 'HH24:MI') AS end_time, payment_status
      FROM public.bookings
      WHERE space_id = ${data.spaceId} AND booking_date = ${data.date}::date
        AND payment_status IN ('pending', 'paid')
      `,
      db`
        SELECT windows FROM public.arena_weekly_hours
        WHERE unit_id = ${space.unit_id} AND weekday = ${weekdayOf(data.date)}
        LIMIT 1
      `,
    ]);
    const occupied = (rows as unknown as AvailabilityRow[]).map((row) => ({
      start: String(row.start_time),
      end: String(row.end_time),
      status: String(row.payment_status),
    }));
    const windows = normalizeWindows((hoursRows as unknown as HoursRow[])[0]?.windows);
    return slotsFor(data.date, windows, Number(space.slot_minutes)).map((s) => {
      const conflict = occupied.find(
        (booked) => toMin(booked.start) < toMin(s.end) && toMin(booked.end) > toMin(s.start),
      );
      const valid = validateSlot(data.date, s.start, windows, Number(space.slot_minutes));
      return {
        ...s,
        status:
          conflict?.status === "paid"
            ? "confirmed"
            : conflict?.status === "pending"
              ? "pending"
              : valid.ok
                ? "available"
                : "unavailable",
      } as const;
    });
  });

const bookingSchema = z.object({
  unitId: z.enum(["unidade-1", "unidade-2"]),
  spaceId: z.string().min(1).max(40),
  date: z.string(),
  starts: z
    .array(z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."))
    .min(1, "Escolha ao menos um horário.")
    .max(MAX_SLOTS, `Escolha até ${MAX_SLOTS} horários.`),
  name: z.string().trim().min(3, "Informe o nome completo.").max(80),
  phone: z.string().max(30),
  notes: z.string().trim().max(500).optional().default(""),
  method: z.enum(["pix", "card_onsite", "cash_onsite"]),
  idempotencyKey: z.string().uuid(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(bookingSchema)
  .handler(async ({ data }) => {
    const db = await database();
    // Idempotência: mesma chave devolve a mesma reserva, antes de consumir rate limit.
    const previous =
      (await db`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
    if (previous[0]) return getPublicBooking(String(previous[0].group_code));

    if (!(await rateLimit(`book:${await clientKey()}`, 10, 600)))
      return { ok: false as const, error: "Muitas tentativas. Aguarde alguns minutos." };

    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false as const, error: "WhatsApp inválido. Use DDD + número." };
    const name = data.name.replace(/[<>]/g, "");

    // Same slot picked twice is a click mistake, not a second reservation.
    const starts = [...new Set(data.starts)].sort();

    const code = `AL-${randomCode(6)}`;
    const expires =
      data.method === "pix" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
    try {
      const outcome = await db.begin(async (tx) => {
        const previousInTransaction =
          (await tx`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
        if (previousInTransaction[0])
          return {
            code: String(previousInTransaction[0].group_code),
            error: null as string | null,
          };

        const spaces = (await tx`
          SELECT id, price_cents, slot_minutes, unit_id FROM public.arena_spaces
          WHERE id = ${data.spaceId} AND unit_id = ${data.unitId}
            AND active = true AND price_cents > 0
          FOR SHARE
        `) as unknown as SpacePriceRow[];
        const space = spaces[0];
        if (!space || space.price_cents === null)
          return { code: null, error: "Quadra indisponível ou ainda sem preço configurado." };

        const hoursRows = (await tx`
          SELECT windows FROM public.arena_weekly_hours
          WHERE unit_id = ${space.unit_id} AND weekday = ${weekdayOf(data.date)}
          LIMIT 1
        `) as unknown as HoursRow[];
        const windows = normalizeWindows(hoursRows[0]?.windows);
        const slots: Array<{ start: string; end: string }> = [];
        for (const start of starts) {
          const valid = validateSlot(data.date, start, windows, Number(space.slot_minutes));
          if (!valid.ok) return { code: null, error: valid.reason };
          slots.push({ start, end: valid.end });
        }

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
              amount_cents, expires_at, notes
            ) VALUES (
              ${bookingCode}, ${code}, ${rowKey}, ${space.id}, ${data.date}::date,
              ${slot.start}::time, ${slot.end}::time, ${name}, ${phone}, ${data.method},
              ${space.price_cents}, ${expires}::timestamptz, ${data.notes || null}
            ) RETURNING id
          `) as unknown as InsertedBookingRow[];
          if (rows[0]) inserted.push({ id: String(rows[0].id) });
        }

        // One charge (and one QR Code) covers the whole reservation. It is created
        // within this transaction so the payment and all booking rows commit together.
        const amount = totalCents(space.price_cents, slots.length);
        const { createPixCharge } = await import("./payments.server");
        const pix =
          data.method === "pix" ? await createPixCharge({ code, amountCents: amount }) : null;
        for (const [index, booking] of inserted.entries()) {
          // provider_ref is unique in the existing schema; one charge belongs to the
          // first row, while the remaining rows retain their per-slot payment state.
          await tx`
            INSERT INTO public.payments (
              booking_id, method, amount_cents, provider, provider_ref,
              is_simulated, pix_payload
            ) VALUES (
              ${booking.id}::uuid, ${data.method}, ${space.price_cents},
              ${pix?.provider ?? "onsite"}, ${index === 0 ? (pix?.ref ?? null) : null},
              ${pix?.simulated ?? false}, ${index === 0 ? (pix?.payload ?? null) : null}
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
        const previousAfterConflict =
          (await db`SELECT group_code FROM public.bookings WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1`) as unknown as GroupCodeRow[];
        if (previousAfterConflict[0])
          return getPublicBooking(String(previousAfterConflict[0].group_code));
      }
      if (codeFromError === "23P01" || codeFromError === "23505") {
        return {
          ok: false as const,
          error: "Um dos horários acabou de ser reservado. Escolha outro.",
        };
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
      code: String(first.group_code),
      date: String(first.booking_date),
      start: String(first.start_time),
      end: String(last.end_time),
      slots: rows.map((row) => ({ start: String(row.start_time), end: String(row.end_time) })),
      method: first.payment_method,
      status: first.payment_status,
      amount: rows.reduce((sum, row) => sum + Number(row.amount_cents), 0),
      expiresAt: first.expires_at,
      firstName: String(first.customer_name).split(" ")[0],
      space: String(first.space_name ?? ""),
      pixPayload: first.pix_payload ?? null,
      pixSimulated: Boolean(first.is_simulated ?? false),
    },
  };
}

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(3).max(80),
      phone: z.string().max(30),
      type: z.enum(["access", "deletion", "correction"]),
      message: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await rateLimit(`privacy:${await clientKey()}`, 5, 3600)))
      return { ok: false, error: "Muitas solicitações." };
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, error: "WhatsApp inválido." };
    const db = await database();
    await db`
      INSERT INTO public.privacy_requests (name, phone, request_type, message)
      VALUES (${data.name}, ${phone}, ${data.type}, ${data.message ?? null})
    `;
    return { ok: true, error: null };
  });

/* ---------------- Pré-inscrição pública do torneio ---------------- */

async function tournamentRegistrationSuccess(code: string) {
  const { createPixCharge } = await import("./payments.server");
  const pix = await createPixCharge({ code, amountCents: TOURNAMENT.entryFeeCents });
  return {
    ok: true as const,
    code,
    pixPayload: pix.payload,
    pixSimulated: pix.simulated,
  };
}

export const registerTournamentTeam = createServerFn({ method: "POST" })
  .inputValidator(tournamentRegistrationSchema)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false as const, error: "WhatsApp inválido. Informe DDD e número." };

    // Honeypot: responde com sucesso sem gravar dados para não informar ao bot que foi detectado.
    if (data.website.trim()) return tournamentRegistrationSuccess(`AL26-${randomCode(8)}`);

    const db = await database();
    const existing = (await db`
      SELECT registration_code FROM public.tournament_registrations
      WHERE submission_key = ${data.submissionId}::uuid LIMIT 1
    `) as unknown as Array<{ registration_code: string }>;
    if (existing[0]) return tournamentRegistrationSuccess(String(existing[0].registration_code));

    const phoneFingerprint = await sha256(`${process.env["DATABASE_URL"] ?? ""}:${phone}`);
    const phoneLimitKey = `tournament-phone:${phoneFingerprint}`;
    if (!(await rateLimit(`tournament:${await clientKey()}`, 8, 3600))) {
      return {
        ok: false as const,
        error: "Muitas tentativas. Aguarde e fale com a Arena pelo WhatsApp.",
      };
    }

    const code = `AL26-${randomCode(8)}`;
    const teamName = data.teamName.replace(/[<>]/g, "").trim();
    try {
      const saved = await db.begin(async (tx) => {
        const previous = (await tx`
          SELECT registration_code FROM public.tournament_registrations
          WHERE submission_key = ${data.submissionId}::uuid LIMIT 1
        `) as unknown as Array<{ registration_code: string }>;
        if (previous[0])
          return {
            code: String(previous[0].registration_code),
            id: null as string | null,
            limited: false as const,
          };

        const phoneAttempt = (await tx`
          WITH attempt AS (
            INSERT INTO public.rate_limits (key, count, window_start)
            VALUES (${phoneLimitKey}, 1, now())
            ON CONFLICT (key) DO UPDATE SET
              count = CASE
                WHEN public.rate_limits.window_start <= now() - make_interval(secs => 3600) THEN 1
                ELSE public.rate_limits.count + 1
              END,
              window_start = CASE
                WHEN public.rate_limits.window_start <= now() - make_interval(secs => 3600) THEN now()
                ELSE public.rate_limits.window_start
              END
            WHERE public.rate_limits.window_start <= now() - make_interval(secs => 3600)
               OR public.rate_limits.count < 1
            RETURNING 1
          )
          SELECT EXISTS (SELECT 1 FROM attempt) AS allowed
        `) as unknown as Array<{ allowed: boolean }>;
        if (!phoneAttempt[0]?.allowed) {
          return { code: null, id: null, limited: true as const };
        }

        const rows = (await tx`
          INSERT INTO public.tournament_registrations (
            registration_code, submission_key, captain_name, captain_phone, team_name, athletes
          ) VALUES (
            ${code}, ${data.submissionId}::uuid, ${data.captainName}, ${phone}, ${teamName}, ${JSON.stringify(data.athletes)}::jsonb
          ) RETURNING id, registration_code
        `) as unknown as Array<{ id: string; registration_code: string }>;
        const row = rows[0];
        if (!row) throw new Error("REGISTRATION_INSERT_FAILED");

        // Auditoria sem nomes, telefone, lista de atletas ou outros dados pessoais.
        await tx`
          INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
          VALUES ('public', 'tournament.registration.create', 'tournament_registration', ${row.id}, ${JSON.stringify({ code: row.registration_code, event: "novembro-azul-2026" })}::jsonb)
        `;
        return { code: String(row.registration_code), id: String(row.id), limited: false as const };
      });
      if (saved.limited) {
        return {
          ok: false as const,
          error:
            "Este WhatsApp já tem uma pré-inscrição recente. Aguarde uma hora ou fale com a Arena.",
        };
      }
      if (!saved.code) throw new Error("REGISTRATION_CODE_MISSING");
      return tournamentRegistrationSuccess(saved.code);
    } catch (error) {
      if (errorCode(error) === "23505") {
        const retry = (await db`
          SELECT registration_code FROM public.tournament_registrations
          WHERE submission_key = ${data.submissionId}::uuid LIMIT 1
        `) as unknown as Array<{ registration_code: string }>;
        if (retry[0]) return tournamentRegistrationSuccess(String(retry[0].registration_code));
      }
      const constraint = errorConstraint(error);
      console.error(
        "tournament registration failed",
        errorCode(error) ?? "unknown",
        constraint ?? "constraint_unknown",
      );
      const constraintMessages: Record<string, string> = {
        tournament_registrations_captain_phone_check:
          "Confira o WhatsApp do capitão e informe DDD e número (10 ou 11 dígitos).",
        tournament_registrations_captain_name_check:
          "Confira o primeiro nome do capitão (de 3 a 80 caracteres).",
        tournament_registrations_team_name_check:
          "O nome da equipe deve ter no máximo 80 caracteres.",
        tournament_registrations_athletes_check:
          "Informe exatamente três atletas além do capitão para completar o quarteto.",
      };
      return {
        ok: false as const,
        error:
          constraintMessages[constraint ?? ""] ??
          "Não foi possível registrar agora. Tente novamente ou fale com a Arena.",
      };
    }
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

export const adminTournamentRegistrations = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await database();
  const rows = (await db`
    SELECT id::text AS id, registration_code, captain_name, captain_phone, team_name,
      athletes, status, created_at::text AS created_at
    FROM public.tournament_registrations
    ORDER BY created_at DESC
    LIMIT 300
  `) as unknown as Array<{
    id: string;
    registration_code: string;
    captain_name: string;
    captain_phone: string;
    team_name: string;
    athletes: unknown;
    status: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    ...row,
    athletes: Array.isArray(row.athletes)
      ? row.athletes.filter((name): name is string => typeof name === "string")
      : [],
    status: row.status as "pending" | "confirmed" | "cancelled",
  }));
});

export const adminSetTournamentRegistrationStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    return db.begin(async (tx) => {
      const rows = (await tx`
        SELECT status FROM public.tournament_registrations
        WHERE id = ${data.id}::uuid FOR UPDATE
      `) as unknown as Array<{ status: string }>;
      if (!rows[0]) return { ok: false as const, error: "Inscrição não encontrada." };
      if (rows[0].status === data.status) return { ok: true as const, error: null };

      await tx`
        UPDATE public.tournament_registrations
        SET status = ${data.status}, updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
        VALUES ('admin', 'tournament.registration.status', 'tournament_registration', ${data.id}::uuid, ${JSON.stringify({ status: data.status })}::jsonb)
      `;
      return { ok: true as const, error: null };
    });
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    if (!(await rateLimit(`login:${await clientKey()}`, 5, 900)))
      return { ok: false, error: "Muitas tentativas. Tente novamente em 15 minutos." };
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) return { ok: false, error: "Acesso indisponível." };
    const [actualHash, expectedHash] = await Promise.all([sha256(data.password), sha256(expected)]);
    let diff = 0;
    for (let i = 0; i < actualHash.length; i++)
      diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
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
    setCookie(COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: SESSION_HOURS * 3600,
    });
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
  try {
    await requireAdmin();
    return { authed: true };
  } catch {
    return { authed: false };
  }
});

export const adminArenaSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await database();
  const [spaceRows, hourRows] = await Promise.all([
    db`
      SELECT id, unit_id, name, sport, slot_minutes, price_cents, active, sort_order
      FROM public.arena_spaces WHERE unit_id IS NOT NULL ORDER BY sort_order
    `,
    db`SELECT unit_id, weekday, windows FROM public.arena_weekly_hours ORDER BY unit_id, weekday`,
  ]);
  return {
    spaces: (
      spaceRows as unknown as Array<{
        id: string;
        unit_id: string;
        name: string;
        sport: string;
        slot_minutes: number;
        price_cents: number | null;
        active: boolean;
        sort_order: number;
      }>
    ).map((space) => ({
      id: space.id,
      unitId: space.unit_id,
      name: space.name,
      sport: space.sport,
      slotMinutes: Number(space.slot_minutes),
      priceCents: space.price_cents === null ? null : Number(space.price_cents),
      active: Boolean(space.active),
      sortOrder: Number(space.sort_order),
    })),
    hours: (
      hourRows as unknown as Array<{ unit_id: string; weekday: number; windows: unknown }>
    ).map((row) => ({
      unitId: row.unit_id,
      weekday: Number(row.weekday),
      windows: normalizeWindows(row.windows),
    })),
  };
});

const adminSpaceSchema = z
  .object({
    id: z.string().min(1).max(40),
    name: z.string().trim().min(2).max(80),
    priceCents: z.number().int().min(1).max(10_000_000).nullable(),
    slotMinutes: z
      .number()
      .int()
      .min(30)
      .max(180)
      .refine((value) => value % 15 === 0),
    active: z.boolean(),
  })
  .superRefine((space, ctx) => {
    if (space.active && (space.priceCents === null || space.priceCents <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceCents"],
        message: "Informe um preço maior que zero antes de ativar a quadra.",
      });
    }
  });

export const adminUpdateArenaSpace = createServerFn({ method: "POST" })
  .inputValidator(adminSpaceSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    const result = await db.begin(async (tx) => {
      const found = (await tx`
        SELECT id FROM public.arena_spaces
        WHERE id = ${data.id} AND unit_id IS NOT NULL FOR UPDATE
      `) as unknown as Array<{ id: string }>;
      if (!found[0]) return { ok: false as const, error: "Quadra não encontrada." };
      await tx`
        UPDATE public.arena_spaces
        SET name = ${data.name}, price_cents = ${data.priceCents},
            slot_minutes = ${data.slotMinutes}, active = ${data.active}
        WHERE id = ${data.id} AND unit_id IS NOT NULL
      `;
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
        VALUES ('admin', 'arena.space.update', 'arena_space', ${data.id}, ${JSON.stringify({ name: data.name, priceCents: data.priceCents, slotMinutes: data.slotMinutes, active: data.active })}::jsonb)
      `;
      return { ok: true as const, error: null };
    });
    spacesCache = undefined;
    return result;
  });

const weeklyHoursSchema = z
  .object({
    unitId: z.enum(["unidade-1", "unidade-2"]),
    weekday: z.number().int().min(0).max(6),
    windows: z
      .array(
        z.object({
          start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        }),
      )
      .max(2),
  })
  .superRefine((schedule, ctx) => {
    const error = validateOpeningWindows(schedule.windows);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["windows"],
        message: error,
      });
    }
  });

export const adminUpdateArenaHours = createServerFn({ method: "POST" })
  .inputValidator(weeklyHoursSchema)
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
      const db = await database();
      const rows = (await db`
        INSERT INTO public.arena_weekly_hours (unit_id, weekday, windows, updated_at)
        VALUES (${data.unitId}, ${data.weekday}, ${JSON.stringify(data.windows)}::jsonb, now())
        ON CONFLICT (unit_id, weekday) DO UPDATE
        SET windows = EXCLUDED.windows, updated_at = now()
        RETURNING unit_id, weekday
      `) as unknown as Array<{ unit_id: string; weekday: number }>;
      if (!rows[0]) return { ok: false as const, error: "O banco não confirmou o salvamento." };

      // A auditoria é secundária: uma falha nela não deve desfazer a grade já salva.
      try {
        await audit(
          "admin",
          "arena.hours.update",
          "arena_weekly_hours",
          `${data.unitId}:${data.weekday}`,
          { windows: data.windows },
        );
      } catch (error) {
        console.error(
          "arena hours audit failed",
          errorCode(error) ?? "unknown",
          errorConstraint(error) ?? "constraint_unknown",
        );
      }
      return { ok: true as const, error: null };
    } catch (error) {
      const code = errorCode(error);
      const unauthorized =
        code === "UNAUTHORIZED" || (error instanceof Error && error.message === "UNAUTHORIZED");
      const message = unauthorized
        ? "Sua sessão de admin expirou. Entre novamente e salve o dia."
        : "Não foi possível salvar a grade no banco. Revise os horários e tente novamente.";
      console.error(
        "arena hours update failed",
        code ?? "unknown",
        errorConstraint(error) ?? "constraint_unknown",
      );
      return { ok: false as const, error: message };
    }
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
        FROM public.bookings b
        WHERE booking_date = ${data.date}::date
          AND EXISTS (
            SELECT 1 FROM public.arena_spaces s WHERE s.id = b.space_id AND s.unit_id IS NULL
          )
        ORDER BY start_time
      `,
      db`SELECT id, name FROM public.arena_spaces WHERE unit_id IS NULL ORDER BY sort_order`,
    ]);
    const bookings = bookingRows as unknown as BookingAdminRow[];
    const spaces = spaceRows as unknown as AdminSpaceRow[];
    return { bookings, spaces, slotsPerSpace: 0 };
  });

export const adminCurrentDay = createServerFn({ method: "GET" })
  .inputValidator(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    await db`
      UPDATE public.bookings SET payment_status = 'expired', updated_at = now()
      WHERE payment_status = 'pending' AND payment_method = 'pix' AND expires_at < now()
    `;
    const rows = (await db`
      SELECT b.id, b.booking_code, b.group_code, b.booking_date::text AS booking_date,
        to_char(b.start_time, 'HH24:MI:SS') AS start_time,
        to_char(b.end_time, 'HH24:MI:SS') AS end_time,
        b.customer_name, b.phone, b.payment_method, b.payment_status, b.amount_cents,
        b.notes, b.space_id, b.created_at::text AS created_at,
        s.name AS space_name, s.unit_id
      FROM public.bookings b
      INNER JOIN public.arena_spaces s ON s.id = b.space_id
      WHERE b.booking_date = ${data.date}::date AND s.unit_id IN ('unidade-1', 'unidade-2')
      ORDER BY b.start_time
    `) as unknown as Array<BookingAdminRow & { space_name: string; unit_id: string }>;
    return { bookings: rows };
  });

export const adminCurrentBookings = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .refine(({ fromDate, toDate }) => {
        const start = Date.parse(`${fromDate}T00:00:00Z`);
        const end = Date.parse(`${toDate}T00:00:00Z`);
        return (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          end >= start &&
          end - start <= 90 * 86_400_000
        );
      }, "O período precisa ser válido e não pode ultrapassar 90 dias."),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    await db`
      UPDATE public.bookings SET payment_status = 'expired', updated_at = now()
      WHERE payment_status = 'pending' AND payment_method = 'pix' AND expires_at < now()
    `;
    const rows = (await db`
      SELECT b.id, b.booking_code, b.group_code, b.booking_date::text AS booking_date,
        to_char(b.start_time, 'HH24:MI:SS') AS start_time,
        to_char(b.end_time, 'HH24:MI:SS') AS end_time,
        b.customer_name, b.phone, b.payment_method, b.payment_status, b.amount_cents,
        b.notes, b.space_id, b.created_at::text AS created_at,
        s.name AS space_name, s.unit_id
      FROM public.bookings b
      INNER JOIN public.arena_spaces s ON s.id = b.space_id
      WHERE s.unit_id IN ('unidade-1', 'unidade-2')
        AND b.booking_date BETWEEN ${data.fromDate}::date AND ${data.toDate}::date
      ORDER BY b.booking_date, b.start_time
      LIMIT 500
    `) as unknown as Array<BookingAdminRow & { space_name: string; unit_id: string }>;
    return { bookings: rows };
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
      AND s.unit_id IS NULL
    ORDER BY b.booking_date, b.start_time LIMIT 100
  `) as unknown as BookingPendingRow[];
  return rows.map((row) => ({
    ...row,
    arena_spaces: row.space_name ? { name: row.space_name } : null,
    space_name: row.space_name ?? row.space_id,
  }));
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      action: z.enum(["mark_paid", "cancel", "note"]),
      note: z.string().max(500).optional(),
    }),
  )
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
        if (booking.payment_status !== "pending")
          return { ok: false, error: "Reserva não está pendente." };
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
          WHERE group_code = ${booking.group_code} AND payment_status IN ('pending', 'paid')
        `;
        await tx`
          UPDATE public.payments SET status = 'cancelled', updated_at = ${now}::timestamptz
          WHERE booking_id IN (
            SELECT id FROM public.bookings WHERE group_code = ${booking.group_code} AND payment_status = 'cancelled'
          )
        `;
      } else {
        await tx`
          UPDATE public.bookings SET notes = ${(data.note ?? "").replace(/[<>]/g, "")}, updated_at = ${now}::timestamptz
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

const copyHoursSchema = z
  .object({
    sourceUnitId: z.enum(["unidade-1", "unidade-2"]),
    targetUnitId: z.enum(["unidade-1", "unidade-2"]),
    days: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          windows: z
            .array(
              z.object({
                start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
              }),
            )
            .max(2),
        }),
      )
      .length(7),
  })
  .superRefine((data, ctx) => {
    if (data.sourceUnitId === data.targetUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetUnitId"],
        message: "Escolha uma unidade diferente para receber a cópia.",
      });
    }
    const weekdays = data.days.map((day) => day.weekday);
    if (new Set(weekdays).size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days"],
        message: "A grade precisa conter cada dia da semana uma única vez.",
      });
    }
    data.days.forEach((day, index) => {
      const parsed = weeklyHoursSchema.safeParse({
        unitId: data.sourceUnitId,
        weekday: day.weekday,
        windows: day.windows,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["days", index, ...issue.path],
            message: issue.message,
          });
        }
      }
    });
  });

/** Copies the current seven-day editor draft transactionally to the other unit. */
export const adminCopyArenaHours = createServerFn({ method: "POST" })
  .inputValidator(copyHoursSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await database();
    await db.begin(async (tx) => {
      for (const day of data.days) {
        await tx`
          INSERT INTO public.arena_weekly_hours (unit_id, weekday, windows, updated_at)
          VALUES (${data.targetUnitId}, ${day.weekday}, ${JSON.stringify(day.windows)}::jsonb, now())
          ON CONFLICT (unit_id, weekday) DO UPDATE
          SET windows = EXCLUDED.windows, updated_at = now()
        `;
      }
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
        VALUES (
          'admin', 'arena.hours.copy', 'arena_weekly_hours', ${data.targetUnitId},
          ${JSON.stringify({ sourceUnitId: data.sourceUnitId, targetUnitId: data.targetUnitId, days: data.days.length })}::jsonb
        )
      `;
    });
    return { ok: true as const, error: null };
  });

export const adminDashboardSummary = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await database();
  const date = arenaNow().date;
  const [statsRows, courtRows, tournamentRows, nextRows] = await Promise.all([
    db`
      SELECT
        COUNT(DISTINCT COALESCE(b.group_code, b.booking_code)) FILTER (
          WHERE b.booking_date = ${date}::date AND b.payment_status IN ('pending', 'paid')
        ) AS today_bookings,
        COUNT(DISTINCT COALESCE(b.group_code, b.booking_code)) FILTER (
          WHERE b.booking_date = ${date}::date AND b.payment_status = 'pending'
        ) AS today_pending
      FROM public.bookings b
      INNER JOIN public.arena_spaces s ON s.id = b.space_id
      WHERE s.unit_id IN ('unidade-1', 'unidade-2')
    `,
    db`
      SELECT COUNT(*) AS count FROM public.arena_spaces
      WHERE unit_id IN ('unidade-1', 'unidade-2') AND active = true AND price_cents > 0
    `,
    db`SELECT COUNT(*) AS count FROM public.tournament_registrations WHERE status = 'pending'`,
    db`
      SELECT booking_date, start_time, customer_name, space_name, unit_id
      FROM (
        SELECT DISTINCT ON (COALESCE(b.group_code, b.booking_code))
          b.booking_date::text AS booking_date,
          to_char(b.start_time, 'HH24:MI') AS start_time,
          b.customer_name,
          s.name AS space_name,
          s.unit_id,
          COALESCE(b.group_code, b.booking_code) AS group_code
        FROM public.bookings b
        INNER JOIN public.arena_spaces s ON s.id = b.space_id
        WHERE s.unit_id IN ('unidade-1', 'unidade-2')
          AND b.booking_date >= ${date}::date AND b.payment_status IN ('pending', 'paid')
        ORDER BY COALESCE(b.group_code, b.booking_code), b.booking_date, b.start_time
      ) upcoming
      ORDER BY booking_date, start_time
      LIMIT 5
    `,
  ]);
  const stats = statsRows[0] as
    { today_bookings: number | string; today_pending: number | string } | undefined;
  return {
    date,
    todayBookings: Number(stats?.today_bookings ?? 0),
    todayPending: Number(stats?.today_pending ?? 0),
    activeCourts: Number((courtRows[0] as { count: number | string } | undefined)?.count ?? 0),
    tournamentPending: Number(
      (tournamentRows[0] as { count: number | string } | undefined)?.count ?? 0,
    ),
    upcoming: nextRows as unknown as Array<{
      booking_date: string;
      start_time: string;
      customer_name: string;
      space_name: string;
      unit_id: string;
    }>,
  };
});

export const adminExportOperationalData = createServerFn({ method: "POST" })
  .inputValidator(z.object({ confirmed: z.literal(true) }))
  .handler(async () => {
    await requireAdmin();
    if (!(await rateLimit(`export:${await clientKey()}`, 3, 60))) {
      return {
        ok: false as const,
        error: "Muitas exportações. Aguarde um minuto e tente novamente.",
      };
    }
    const db = await database();
    const [spaces, hours, bookings, registrations] = await Promise.all([
      db`
        SELECT id, unit_id, name, sport, slot_minutes, price_cents, active, sort_order
        FROM public.arena_spaces ORDER BY sort_order
      `,
      db`SELECT unit_id, weekday, windows, updated_at FROM public.arena_weekly_hours ORDER BY unit_id, weekday`,
      db`
        SELECT id, booking_code, group_code, space_id, booking_date::text AS booking_date,
          to_char(start_time, 'HH24:MI:SS') AS start_time, to_char(end_time, 'HH24:MI:SS') AS end_time,
          customer_name, phone, payment_method, payment_status, amount_cents, expires_at::text AS expires_at,
          notes, created_at::text AS created_at
        FROM public.bookings ORDER BY booking_date, start_time
      `,
      db`
        SELECT registration_code, captain_name, captain_phone, team_name, athletes,
          status, created_at::text AS created_at
        FROM public.tournament_registrations ORDER BY created_at
      `,
    ]);
    await audit("admin", "data.export", "arena_data", undefined, {
      spaces: spaces.length,
      hours: hours.length,
      bookings: bookings.length,
      tournamentRegistrations: registrations.length,
    });
    return {
      ok: true as const,
      data: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        includes: ["quadras", "grade semanal", "reservas", "pre-inscricoes do torneio"],
        excludes: ["senhas", "sessoes administrativas", "tokens", "payloads de pagamento"],
        spaces,
        weeklyHours: hours,
        bookings,
        tournamentRegistrations: registrations,
      },
    };
  });
