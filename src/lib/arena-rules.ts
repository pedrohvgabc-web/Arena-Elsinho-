// Pure business rules for Arena Elsinho. Shared by server (authoritative) and UI (display only).
export const ARENA_TZ = "America/Cuiaba";
export const SLOT_MINUTES = 60;

export type PaymentMethod = "pix" | "card_onsite" | "cash_onsite";
export type PaymentStatus = "pending" | "paid" | "cancelled" | "expired" | "failed";
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix online",
  card_onsite: "Cartão no local",
  cash_onsite: "Dinheiro no local",
};
export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  expired: "Expirado",
  failed: "Falhou",
};

/** Opening windows in minutes from midnight, by weekday (0 = Sunday). */
export function openingWindows(weekday: number): Array<[number, number]> {
  if (weekday === 0) return [];
  if (weekday === 1) return [[9 * 60, 18 * 60]];
  return [
    [8 * 60, 12 * 60],
    [14 * 60, 23 * 60 + 59],
  ];
}

export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function weekdayOf(dateISO: string) {
  const [y = 1970, m = 1, d = 1] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Slots: hourly from each window start; last slot may be shortened to window end (23:00–23:59). */
export function slotsFor(dateISO: string): Array<{ start: string; end: string }> {
  const out: Array<{ start: string; end: string }> = [];
  for (const [open, close] of openingWindows(weekdayOf(dateISO))) {
    for (let s = open; s + 59 <= close; s += SLOT_MINUTES) {
      out.push({ start: toHHMM(s), end: toHHMM(Math.min(s + SLOT_MINUTES, close)) });
    }
  }
  return out;
}

/** Current date and minutes in the arena timezone. */
export function arenaNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARENA_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: (Number(g("hour")) % 24) * 60 + Number(g("minute")) };
}

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return /^[1-9]{2}9?\d{8}$/.test(digits) ? digits : null;
}

export type SlotCheck = { ok: true; end: string } | { ok: false; reason: string };

export function validateSlot(dateISO: string, start: string, now = new Date()): SlotCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !/^\d{2}:\d{2}$/.test(start)) return { ok: false, reason: "Data ou horário inválido." };
  if (weekdayOf(dateISO) === 0) return { ok: false, reason: "A arena não abre aos domingos." };
  const n = arenaNow(now);
  if (dateISO < n.date) return { ok: false, reason: "Não é possível reservar datas passadas." };
  const slot = slotsFor(dateISO).find((s) => s.start === start);
  if (!slot) return { ok: false, reason: "Horário fora do expediente." };
  if (dateISO === n.date && toMin(start) <= n.minutes) return { ok: false, reason: "Esse horário já passou." };
  return { ok: true, end: slot.end };
}

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** How many hourly slots one customer may book at once. */
export const MAX_SLOTS = 8;

/** Total for N slots of the same space. */
export const totalCents = (priceCents: number, count: number) => priceCents * Math.max(0, count);

/** Merge selected hourly starts into continuous ranges: ["19:00","20:00","22:00"] -> [["19:00","21:00"],["22:00","23:00"]]. */
export function groupRanges(starts: string[], slotMinutes = SLOT_MINUTES): Array<[string, string]> {
  const uniq = [...new Set(starts)].sort();
  const out: Array<[string, string]> = [];
  for (const s of uniq) {
    const last = out[out.length - 1];
    if (last && toMin(s) === toMin(last[1])) last[1] = toHHMM(toMin(last[1]) + slotMinutes);
    else out.push([s, toHHMM(toMin(s) + slotMinutes)]);
  }
  return out;
}

/** "19:00 – 21:00 · 22:00" for display. */
export const formatRanges = (starts: string[]) =>
  groupRanges(starts).map(([a, b]) => (a === b ? a : `${a} – ${b}`)).join(" · ");

export const maskPhone = (p: string) => (p.length >= 10 ? `(${p.slice(0, 2)}) •••••-${p.slice(-4)}` : "•••");
