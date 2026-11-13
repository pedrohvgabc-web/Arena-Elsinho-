// Regras de reserva da Arena Leste. A grade de cada unidade vem do Neon.
export const ARENA_TZ = "America/Porto_Velho";
export const SLOT_MINUTES = 60;

export type OpeningWindow = { start: string; end: string };
export type PaymentMethod = "pix" | "card_onsite" | "cash_onsite";
export type PaymentPlan = "full" | "deposit_30";
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

/** Normaliza espaços para guardar um nome legível e verificar nome + sobrenome. */
export function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function hasFirstAndLastName(value: string) {
  return normalizeFullName(value).split(" ").filter(Boolean).length >= 2;
}

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

/** Agenda pública navegável até seis meses à frente. */
export const BOOKING_HORIZON_DAYS = 180;

/** Dias de um mês para um calendário que começa no domingo; null representa célula vazia. */
export function calendarMonthDays(monthISO: string): Array<string | null> {
  if (!/^\d{4}-\d{2}$/.test(monthISO)) return [];
  const [year = 0, month = 0] = monthISO.split("-").map(Number);
  if (month < 1 || month > 12 || year < 1) return [];
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix: Array<string | null> = Array.from({ length: firstWeekday }, () => null);
  const days = Array.from(
    { length: daysInMonth },
    (_, index) => `${monthISO}-${String(index + 1).padStart(2, "0")}`,
  );
  return [...prefix, ...days];
}

function validDate(dateISO: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const [year = 0, month = 0, day = 0] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === dateISO;
}

export function isWithinBookingHorizon(dateISO: string, todayISO: string) {
  if (!validDate(dateISO) || !validDate(todayISO) || dateISO < todayISO) return false;
  const latest = new Date(`${todayISO}T12:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() + BOOKING_HORIZON_DAYS);
  return dateISO <= latest.toISOString().slice(0, 10);
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
  const current = arenaNow(now);
  if (dateISO < current.date)
    return { ok: false, reason: "Não é possível reservar datas passadas." };
  if (!isWithinBookingHorizon(dateISO, current.date))
    return { ok: false, reason: "A agenda aceita reservas até 180 dias à frente." };
  const slot = slotsFor(dateISO, windows, slotMinutes).find((item) => item.start === start);
  if (!slot)
    return {
      ok: false,
      reason: windows.length
        ? "Horário fora do expediente."
        : "A grade desta unidade ainda não foi configurada para este dia.",
    };
  if (dateISO === current.date && toMin(start) <= current.minutes)
    return { ok: false, reason: "Esse horário já passou." };
  return { ok: true, end: slot.end };
}

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// A 16-hour booking can contain up to 32 slots when the configured slot is 30 minutes.
export const MAX_BOOKING_MINUTES = 16 * 60;
export const MAX_SLOTS = MAX_BOOKING_MINUTES / 30;
export const totalCents = (priceCents: number, count: number) => priceCents * Math.max(0, count);

export const MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR = 5_000;

export function calculateBookingPrice(priceCents: number, slotMinutes: number, count: number) {
  const quantity = Math.max(0, Math.floor(count));
  const regularPrice = Number.isFinite(priceCents) ? Math.max(0, Math.round(priceCents)) : 0;
  const validDuration = Number.isInteger(slotMinutes) && slotMinutes > 0;
  if (!quantity || !validDuration) return { perSlotCents: 0, totalCents: 0, promoApplied: false };

  const regularHourlyRate = (regularPrice * 60) / slotMinutes;
  const totalDurationMinutes = quantity * slotMinutes;
  const promoApplied =
    totalDurationMinutes > 60 && regularHourlyRate > MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR;
  const perSlotCents = promoApplied
    ? Math.round((MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR * slotMinutes) / 60)
    : regularPrice;

  return { perSlotCents, totalCents: perSlotCents * quantity, promoApplied };
}

export function formatDuration(minutes: number) {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return (
    [hours ? `${hours} h` : null, remainingMinutes ? `${remainingMinutes} min` : null]
      .filter(Boolean)
      .join(" ") || "0 min"
  );
}

export function initialPaymentCents(total: number, plan: PaymentPlan) {
  const safeTotal = Number.isSafeInteger(total) ? Math.max(0, total) : 0;
  return plan === "deposit_30" ? Math.round((safeTotal * 30) / 100) : safeTotal;
}

/** Divide a group payment across its booking rows without losing centavos. */
export function splitAmountCents(amount: number, count: number) {
  const safeAmount = Number.isSafeInteger(amount) ? Math.max(0, amount) : 0;
  const quantity = Math.max(0, Math.floor(count));
  if (!quantity) return [];
  const base = Math.floor(safeAmount / quantity);
  const remainder = safeAmount % quantity;
  return Array.from({ length: quantity }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function verifiedPaymentAmountCents(
  items: Array<{
    provider: string | null;
    providerStatus: string | null;
    bookingStatus: PaymentStatus;
    amountCents: number | null;
  }>,
) {
  return items.reduce((sum, item) => {
    const amount = Number(item.amountCents);
    if (!Number.isSafeInteger(amount) || amount < 0) return sum;
    const verified =
      (item.provider === "infinitepay" && item.providerStatus === "paid") ||
      (item.provider === "onsite" && item.bookingStatus === "paid");
    return verified ? sum + amount : sum;
  }, 0);
}

export function paymentProgressPercentages(totalCents: number, receivedCents: number) {
  const total = Number.isSafeInteger(totalCents) && totalCents > 0 ? totalCents : 0;
  const safeReceived = Number.isSafeInteger(receivedCents) ? Math.max(0, receivedCents) : 0;
  const received = Math.min(total, safeReceived);
  const remaining = total - received;
  return {
    receivedCents: received,
    remainingCents: remaining,
    receivedPercentage: total ? Math.round((received * 100) / total) : 0,
    remainingPercentage: total ? Math.round((remaining * 100) / total) : 0,
  };
}

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
