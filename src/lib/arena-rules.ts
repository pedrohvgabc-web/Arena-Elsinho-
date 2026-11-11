// Regras de reserva da Arena Leste. A grade de cada unidade vem do Neon.
export const ARENA_TZ = "America/Porto_Velho";
export const SLOT_MINUTES = 60;

export type OpeningWindow = { start: string; end: string };
export type PaymentMethod = "pix" | "card_onsite" | "cash_onsite";
export type PaymentStatus = "pending" | "paid" | "cancelled" | "expired" | "failed";
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix demonstrativo",
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

export const toMin = (time: string) => {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function validateOpeningWindows(windows: OpeningWindow[]) {
  if (windows.length > 2) return "Defina no máximo dois intervalos por dia.";
  const ordered = [...windows].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (const [index, window] of ordered.entries()) {
    if (!validTime(window.start) || !validTime(window.end, true)) {
      return "Informe horários de abertura e fechamento válidos.";
    }
    if (toMin(window.end) <= toMin(window.start)) {
      return "O fechamento deve ser depois da abertura.";
    }
    const previous = ordered[index - 1];
    if (previous && toMin(window.start) < toMin(previous.end)) {
      return "Os intervalos não podem se sobrepor.";
    }
  }
  return null;
}

/** Sugere um intervalo de pelo menos uma hora que não se sobrepõe ao existente. */
export function suggestOpeningWindow(windows: OpeningWindow[]): OpeningWindow | null {
  const ordered = windows
    .filter((window) => validTime(window.start) && validTime(window.end, true))
    .filter((window) => toMin(window.end) > toMin(window.start))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
  let cursor = 8 * 60;
  const dayEnd = 23 * 60;
  const maxSuggestionMinutes = 4 * 60;

  for (const window of ordered) {
    const start = toMin(window.start);
    const gapEnd = Math.min(start, dayEnd);
    if (gapEnd - cursor >= 60) {
      return {
        start: toHHMM(cursor),
        end: toHHMM(Math.min(gapEnd, cursor + maxSuggestionMinutes)),
      };
    }
    cursor = Math.max(cursor, toMin(window.end));
  }

  if (dayEnd - cursor >= 60) {
    return { start: toHHMM(cursor), end: toHHMM(Math.min(dayEnd, cursor + maxSuggestionMinutes)) };
  }
  return null;
}

export function weekdayOf(dateISO: string) {
  const [year = 1970, month = 1, day = 1] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function validDate(dateISO: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const [year = 0, month = 0, day = 0] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === dateISO;
}

function validTime(time: string, allowEndOfDay = false) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hour = 99, minute = 99] = time.split(":").map(Number);
  return (
    (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) || (allowEndOfDay && time === "24:00")
  );
}

/** Gera horários completos dentro das janelas salvas para a unidade e o dia. */
export function slotsFor(
  dateISO: string,
  windows: OpeningWindow[] = [],
  slotMinutes = SLOT_MINUTES,
): Array<{ start: string; end: string }> {
  if (
    !validDate(dateISO) ||
    !Number.isInteger(slotMinutes) ||
    slotMinutes < 15 ||
    slotMinutes > 240
  )
    return [];
  const out: Array<{ start: string; end: string }> = [];
  for (const window of windows) {
    if (!validTime(window.start) || !validTime(window.end, true)) continue;
    const open = toMin(window.start);
    const close = toMin(window.end);
    if (close <= open) continue;
    for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
      out.push({ start: toHHMM(start), end: toHHMM(start + slotMinutes) });
    }
  }
  return [...new Map(out.map((slot) => [slot.start, slot])).values()].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
}

/** Data e minutos atuais no fuso local de Porto Velho. */
export function arenaNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARENA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: (Number(part("hour")) % 24) * 60 + Number(part("minute")),
  };
}

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return /^[1-9]{2}9?\d{8}$/.test(digits) ? digits : null;
}

export type SlotCheck = { ok: true; end: string } | { ok: false; reason: string };

export function validateSlot(
  dateISO: string,
  start: string,
  windows: OpeningWindow[] = [],
  slotMinutes = SLOT_MINUTES,
  now = new Date(),
): SlotCheck {
  if (!validDate(dateISO) || !validTime(start))
    return { ok: false, reason: "Data ou horário inválido." };
  if (dateISO < arenaNow(now).date)
    return { ok: false, reason: "Não é possível reservar datas passadas." };
  const slot = slotsFor(dateISO, windows, slotMinutes).find((item) => item.start === start);
  if (!slot)
    return {
      ok: false,
      reason: windows.length
        ? "Horário fora do expediente."
        : "A grade desta unidade ainda não foi configurada para este dia.",
    };
  const current = arenaNow(now);
  if (dateISO === current.date && toMin(start) <= current.minutes)
    return { ok: false, reason: "Esse horário já passou." };
  return { ok: true, end: slot.end };
}

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const MAX_SLOTS = 8;
export const totalCents = (priceCents: number, count: number) => priceCents * Math.max(0, count);

/** Junta horários escolhidos em faixas contínuas para leitura do cliente/admin. */
export function groupRanges(starts: string[], slotMinutes = SLOT_MINUTES): Array<[string, string]> {
  const unique = [...new Set(starts)].sort();
  const out: Array<[string, string]> = [];
  for (const start of unique) {
    const last = out[out.length - 1];
    if (last && toMin(start) === toMin(last[1])) last[1] = toHHMM(toMin(last[1]) + slotMinutes);
    else out.push([start, toHHMM(toMin(start) + slotMinutes)]);
  }
  return out;
}

export const formatRanges = (starts: string[]) =>
  groupRanges(starts)
    .map(([start, end]) => (start === end ? start : `${start} – ${end}`))
    .join(" · ");

export const maskPhone = (phone: string) =>
  phone.length >= 10 ? `(${phone.slice(0, 2)}) •••••-${phone.slice(-4)}` : "•••";
