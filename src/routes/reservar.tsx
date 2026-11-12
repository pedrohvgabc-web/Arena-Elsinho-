import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, MessageCircle, ShieldCheck, Ticket, X } from "lucide-react";
import { SITE, waLink } from "@/lib/site";
import {
  createBooking,
  getPublicPaymentConfig,
  getAvailability,
  getPublicBookingDates,
  getSpaces,
} from "@/lib/arena.functions";
import {
  ARENA_TZ,
  arenaNow,
  calculateBookingPrice,
  calendarMonthDays,
  BOOKING_HORIZON_DAYS,
  formatDuration,
  formatBRL,
  initialPaymentCents,
  MAX_BOOKING_MINUTES,
  MAX_SLOTS,
  MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR,
  type PaymentMethod,
  type PaymentPlan,
} from "@/lib/arena-rules";
import { formatCpfInput, normalizeValidCpf } from "@/lib/customer-data";

type UnitId = "unidade-1" | "unidade-2";
type Space = {
  id: string;
  name: string;
  sport: string;
  capacity: number | null;
  slot_minutes: number;
  price_cents: number;
  active: boolean;
  unit_id: UnitId;
};
type TimeSlot = {
  start: string;
  end: string;
  status: "available" | "pending" | "confirmed" | "unavailable";
};
type BookingResult = {
  code: string;
  date: string;
  start: string;
  end: string;
  slots: Array<{ start: string; end: string }>;
  method: PaymentMethod;
  status: string;
  amount: number;
  chargeAmount: number;
  balanceDue: number;
  paymentPlan: PaymentPlan;
  promoApplied: boolean;
  expiresAt: string | null;
  firstName: string;
  space: string;
  pixPayload: string | null;
  pixSimulated: boolean;
  checkoutUrl: string | null;
};
type BookingDraft = { name: string; phone: string; cpf: string; address: string; notes: string };

const UNIT_IDS: UnitId[] = ["unidade-1", "unidade-2"];
const PROMO_DISMISSED_KEY = "arena-leste-promo-dismissed-v1";
const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "pix", label: "Pix demonstrativo · sem cobrança real" },
  { value: "card_onsite", label: "Cartão no local" },
  { value: "cash_onsite", label: "Dinheiro no local" },
];
const pad = (value: number) => String(value).padStart(2, "0");

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function dateLabel(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ARENA_TZ,
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, 12)));
}
function calendarMonthLabel(monthISO: string) {
  const [year = 2026, month = 1] = monthISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: ARENA_TZ,
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}
function shiftMonth(monthISO: string, change: number) {
  const [year = 2026, month = 1] = monthISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + change, 1, 12));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}
function formatSlot(slot: { start: string; end: string }) {
  const end = slot.end.slice(0, 5);
  return `${slot.start.slice(0, 5)} – ${end === "24:00" ? "00:00 (+1 dia)" : end}`;
}

export const Route = createFileRoute("/reservar")({
  loader: async () => await getSpaces(),
  validateSearch: (search: Record<string, unknown>) => ({
    unit: UNIT_IDS.includes(search["unit"] as UnitId) ? (search["unit"] as UnitId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Agendar — Arena Leste Multi Sports" },
      {
        name: "description",
        content:
          "Escolha a unidade, quadra, dia e horário para reservar na Arena Leste em Porto Velho.",
      },
      { property: "og:title", content: "Agende sua quadra — Arena Leste" },
      {
        property: "og:description",
        content: "Agendamento online para as quadras de areia das duas unidades.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:url", content: `${SITE.url}/reservar` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/reservar` }],
  }),
  component: Reservar,
});

function Reservar() {
  const search = Route.useSearch();
  const fetchSpaces = useServerFn(getSpaces);
  const fetchPaymentConfig = useServerFn(getPublicPaymentConfig);
  const fetchDates = useServerFn(getPublicBookingDates);
  const fetchAvailability = useServerFn(getAvailability);
  const submitBooking = useServerFn(createBooking);
  const queryClient = useQueryClient();
  const initialSpaces = Route.useLoaderData();
  const [unitId, setUnitId] = useState<UnitId>(search.unit ?? "unidade-1");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [starts, setStarts] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [idempotencyKey, setIdempotencyKey] = useState(() => globalThis.crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("full");
  const [paymentPlanLocked, setPaymentPlanLocked] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BookingDraft | null>(null);
  const paymentDialogRef = useRef<HTMLDialogElement>(null);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoReady, setPromoReady] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const promoDialogRef = useRef<HTMLDialogElement>(null);
  const promoTriggerRef = useRef<HTMLButtonElement>(null);
  const promoReturnFocusRef = useRef<HTMLHeadingElement>(null);
  const cancellationDialogRef = useRef<HTMLDialogElement>(null);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [visibleMonth, setVisibleMonth] = useState(() => arenaNow().date.slice(0, 7));

  useEffect(() => {
    try {
      setPromoDismissed(window.localStorage.getItem(PROMO_DISMISSED_KEY) === "1");
    } catch {
      setPromoDismissed(false);
    }
    setPromoReady(true);
  }, []);

  const paymentConfigQuery = useQuery({
    queryKey: ["public-payment-config"],
    queryFn: () => fetchPaymentConfig(),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const paymentMode = paymentConfigQuery.data?.mode ?? null;
  useEffect(() => {
    const dialog = paymentDialogRef.current;
    if (!dialog) return;
    if (paymentDialogOpen && !dialog.open) dialog.showModal();
    if (!paymentDialogOpen && dialog.open) dialog.close();
  }, [paymentDialogOpen]);
  useEffect(() => {
    const dialog = promoDialogRef.current;
    if (!dialog) return;
    if (promoDialogOpen && !dialog.open) dialog.showModal();
    if (!promoDialogOpen && dialog.open) dialog.close();
  }, [promoDialogOpen]);
  useEffect(() => {
    const dialog = cancellationDialogRef.current;
    if (!dialog) return;
    if (cancellationDialogOpen && !dialog.open) dialog.showModal();
    if (!cancellationDialogOpen && dialog.open) dialog.close();
  }, [cancellationDialogOpen]);
  const paymentMethods = METHODS.map((method) =>
    method.value !== "pix"
      ? method
      : {
          ...method,
          label:
            paymentMode === "infinitepay"
              ? "Pix ou cartão · InfinitePay"
              : paymentMode === "unavailable"
                ? "Pix ou cartão · indisponível"
                : paymentMode === "demo"
                  ? "Pix demonstrativo · sem cobrança real"
                  : "Verificando checkout…",
        },
  );

  const spacesQuery = useQuery({
    queryKey: ["booking-spaces"],
    queryFn: () => fetchSpaces(),
    initialData: initialSpaces,
    staleTime: 5_000,
  });
  const spaces = useMemo(() => (spacesQuery.data ?? []) as Space[], [spacesQuery.data]);
  const unitSpaces = useMemo(
    () => spaces.filter((space) => space.unit_id === unitId),
    [spaces, unitId],
  );
  const selectedSpace = unitSpaces.find((space) => space.id === spaceId) ?? null;

  useEffect(() => {
    if (!unitSpaces.length) {
      setSpaceId(null);
      return;
    }
    if (!unitSpaces.some((space) => space.id === spaceId)) setSpaceId(unitSpaces[0]!.id);
  }, [unitSpaces, spaceId]);

  const datesQuery = useQuery({
    queryKey: ["booking-dates", unitId],
    queryFn: () => fetchDates({ data: { unitId } }),
    enabled: unitSpaces.length > 0,
    staleTime: 60_000,
  });
  const openDates = useMemo(() => datesQuery.data ?? [], [datesQuery.data]);
  const openDateSet = useMemo(() => new Set(openDates), [openDates]);
  const todayDate = arenaNow().date;
  const firstCalendarMonth = todayDate.slice(0, 7);
  const lastCalendarMonth = addDays(todayDate, BOOKING_HORIZON_DAYS).slice(0, 7);
  const calendarDays = useMemo(() => calendarMonthDays(visibleMonth), [visibleMonth]);
  const availabilityQuery = useQuery({
    queryKey: ["booking-availability", spaceId, date],
    queryFn: () => fetchAvailability({ data: { spaceId: spaceId!, date: date! } }),
    enabled: Boolean(spaceId && date),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  const slots = useMemo(
    () => (availabilityQuery.data ?? []) as TimeSlot[],
    [availabilityQuery.data],
  );
  const selectedSlots = slots.filter(
    (slot) => starts.includes(slot.start) && slot.status === "available",
  );
  useEffect(() => {
    const available = new Set(
      slots.filter((slot) => slot.status === "available").map((slot) => slot.start),
    );
    setStarts((current) => {
      const next = current.filter((value) => available.has(value));
      return next.length === current.length ? current : next;
    });
  }, [slots]);
  useEffect(() => {
    if (paymentMode === "unavailable" && paymentMethod === "pix") {
      setPaymentMethod("card_onsite");
    }
  }, [paymentMode, paymentMethod]);
  const unit = SITE.units.find((item) => item.id === unitId)!;
  const pricing = selectedSpace
    ? calculateBookingPrice(
        selectedSpace.price_cents,
        selectedSpace.slot_minutes,
        selectedSlots.length,
      )
    : null;
  const selectedDurationMinutes = selectedSlots.length * (selectedSpace?.slot_minutes ?? 60);
  const maxSelectableSlots = Math.min(
    MAX_SLOTS,
    Math.floor(MAX_BOOKING_MINUTES / (selectedSpace?.slot_minutes ?? 60)),
  );
  const regularHourlyRateCents = selectedSpace
    ? Math.round((selectedSpace.price_cents * 60) / selectedSpace.slot_minutes)
    : 6_000;
  const promoAvailable = selectedSpace
    ? (selectedSpace.price_cents * 60) / selectedSpace.slot_minutes >
      MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR
    : regularHourlyRateCents > MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR;
  const promoHourlyRateCents = promoAvailable
    ? MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR
    : regularHourlyRateCents;
  const appliedHourlyRateCents = pricing?.promoApplied
    ? MULTI_SLOT_PROMO_RATE_CENTS_PER_HOUR
    : regularHourlyRateCents;
  const totalCents = pricing?.totalCents ?? 0;
  const chargeCents = initialPaymentCents(totalCents, paymentPlan);
  const balanceDueCents = Math.max(0, totalCents - chargeCents);

  function resetIdempotency() {
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setError(null);
  }
  function chooseUnit(nextUnit: UnitId) {
    if (nextUnit === unitId) return;
    setUnitId(nextUnit);
    setSpaceId(null);
    setDate(null);
    setStarts([]);
    resetIdempotency();
  }
  function chooseCourt(id: string) {
    if (id === spaceId) return;
    setSpaceId(id);
    setDate(null);
    setStarts([]);
    resetIdempotency();
  }
  function chooseDate(nextDate: string) {
    setDate(nextDate);
    setVisibleMonth(nextDate.slice(0, 7));
    setStarts([]);
    resetIdempotency();
  }
  function chooseTime(nextStart: string) {
    if (starts.includes(nextStart)) {
      setStarts((current) => current.filter((value) => value !== nextStart));
    } else if (
      starts.length >= maxSelectableSlots ||
      (starts.length + 1) * (selectedSpace?.slot_minutes ?? 60) > MAX_BOOKING_MINUTES
    ) {
      setError("Você pode reservar até 16 horas por pedido.");
      return;
    } else {
      setStarts((current) =>
        current.includes(nextStart) ? current : [...current, nextStart].sort(),
      );
    }
    resetIdempotency();
  }

  function goToBookingStep(nextStep: number) {
    setBookingStep(nextStep);
    setError(null);
    requestAnimationFrame(() => {
      const step = document.querySelector<HTMLElement>(`[data-booking-step="${nextStep}"]`);
      if (!step) return;
      step.focus({ preventScroll: true });
      step.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function continueBookingStep() {
    if (bookingStep === 1 && !selectedSpace) {
      setError("Escolha uma quadra disponível para continuar.");
      return;
    }
    if (bookingStep === 2 && !date) {
      setError("Escolha um dia aberto para carregar os horários.");
      return;
    }
    if (bookingStep === 2 && !selectedSlots.length) {
      setError("Escolha pelo menos um horário livre para continuar.");
      return;
    }
    goToBookingStep(Math.min(3, bookingStep + 1));
  }

  function closePromo() {
    const dialog = promoDialogRef.current;
    if (dialog?.open) dialog.close();
    else dismissPromo();
  }

  function dismissPromo() {
    setPromoDialogOpen(false);
    setPromoDismissed(true);
    try {
      window.localStorage.setItem(PROMO_DISMISSED_KEY, "1");
    } catch {
      // The CTA still disappears for this mounted page if storage is unavailable.
    }
    requestAnimationFrame(() => promoReturnFocusRef.current?.focus({ preventScroll: true }));
  }

  function continueAfterCancellationNotice() {
    cancellationDialogRef.current?.close();
    setCancellationDialogOpen(false);
    if (paymentMethod === "pix" && paymentMode === "infinitepay") {
      setPaymentPlan("full");
      setPaymentPlanLocked(false);
      setPaymentDialogOpen(true);
      return;
    }
    if (pendingDraft) void submitDraft(pendingDraft, "full");
  }

  async function finishBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace || !date || !selectedSlots.length) return;
    const form = new FormData(event.currentTarget);
    const cpf = normalizeValidCpf(String(form.get("cpf") ?? ""));
    if (!cpf) {
      setError("Confira o CPF informado.");
      return;
    }
    const address = String(form.get("address") ?? "").trim();
    if (address.length < 8) {
      setError("Informe o endereço completo.");
      return;
    }
    if (form.get("privacyConsent") !== "on") {
      setError("Confirme o uso dos dados para continuar.");
      return;
    }
    const draft: BookingDraft = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      cpf,
      address,
      notes: String(form.get("notes") ?? ""),
    };
    setPendingDraft(draft);
    setError(null);
    setCancellationDialogOpen(true);
  }

  async function submitDraft(draft: BookingDraft, selectedPlan: PaymentPlan) {
    if (!selectedSpace || !date || !selectedSlots.length) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitBooking({
        data: {
          unitId,
          spaceId: selectedSpace.id,
          date,
          starts: selectedSlots.map((slot) => slot.start),
          name: draft.name,
          phone: draft.phone,
          cpf: draft.cpf,
          address: draft.address,
          privacyConsent: true,
          notes: draft.notes,
          method: paymentMethod,
          paymentPlan: selectedPlan,
          idempotencyKey,
        },
      });
      if (!result.ok) {
        setError(result.error);
        if ("existingPaymentPlan" in result) {
          setPaymentPlan(result.existingPaymentPlan);
          setPaymentPlanLocked(true);
        }
        await queryClient.invalidateQueries({ queryKey: ["booking-availability", spaceId, date] });
        return;
      }
      const createdBooking = result.booking as BookingResult;
      setBooking(createdBooking);
      setPaymentDialogOpen(false);
      if (createdBooking.checkoutUrl) window.location.assign(createdBooking.checkoutUrl);
    } catch {
      setError("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function startNewBooking() {
    setBooking(null);
    setUnitId(search.unit ?? "unidade-1");
    setDate(null);
    setStarts([]);
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setPaymentPlan("full");
    setPaymentPlanLocked(false);
    setPendingDraft(null);
    setPaymentDialogOpen(false);
    setCancellationDialogOpen(false);
    setBookingStep(1);
    setVisibleMonth(arenaNow().date.slice(0, 7));
  }

  const contactMessage = booking
    ? `Olá! Acabei de fazer uma reserva online na ${SITE.shortName}. Código ${booking.code}; ${booking.space}; ${booking.date.split("-").reverse().join("/")}; horários ${booking.slots.map(formatSlot).join(", ")}. Gostaria de tirar uma dúvida.`
    : "";

  return (
    <div id="vRes" className="res">
      <header className="rh2">
        <Link className="logo" to="/" aria-label="Arena Leste — início">
          <img
            src="/images/arena-leste-zip-logo.png"
            alt="Arena Leste Multi Sports"
            width="159"
            height="119"
          />
        </Link>
        <Link className="mono" to="/">
          ← Voltar ao site
        </Link>
      </header>
      <main id="conteudo" className="wrap rb">
        <span className="mono">Arena Leste · Reservar</span>
        <h1 ref={promoReturnFocusRef} className="rt" tabIndex={-1}>
          Reserve
          <br />
          <b>sua quadra</b>
        </h1>

        {!booking && promoReady && !promoDismissed && (
          <button
            ref={promoTriggerRef}
            type="button"
            className="booking-promo"
            aria-haspopup="dialog"
            aria-expanded={promoDialogOpen}
            aria-label="Aperte para liberar sua PROMOÇÃO"
            onClick={() => setPromoDialogOpen(true)}
          >
            <span>Aperte para liberar sua PROMOÇÃO</span>
          </button>
        )}

        {booking ? (
          <BookingConfirmation
            booking={booking}
            onNewBooking={startNewBooking}
            helpMessage={contactMessage}
          />
        ) : (
          <form className="rv" onSubmit={finishBooking}>
            <div className="booking-flow">
              <fieldset data-booking-step="1" data-active={bookingStep === 1} tabIndex={-1}>
                <legend className="mono">1 · Unidade e quadra</legend>
                <div className="opts">
                  {SITE.units.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      className="uc"
                      aria-pressed={unitId === option.id}
                      onClick={() => chooseUnit(option.id as UnitId)}
                    >
                      <b>{index === 0 ? "Cuniã" : "Pinheiro Machado"}</b>
                      <span>{option.address}</span>
                      <em>Quadras de areia · Vôlei de praia</em>
                    </button>
                  ))}
                </div>
                <div className="courtselect">
                  <span className="mono">Escolha a quadra</span>
                  {spacesQuery.isLoading ? (
                    <p className="hint">
                      <LoaderCircle size={16} className="loading-icon" /> Carregando quadras…
                    </p>
                  ) : spacesQuery.isError ? (
                    <p className="hint" role="alert">
                      Não foi possível carregar as quadras. Tente novamente.
                    </p>
                  ) : unitSpaces.length ? (
                    <div className="opts">
                      {unitSpaces.map((space) => (
                        <button
                          key={space.id}
                          type="button"
                          className="opt"
                          aria-pressed={space.id === spaceId}
                          onClick={() => chooseCourt(space.id)}
                        >
                          {space.name}
                          <small>
                            {formatBRL(space.price_cents)} · {space.slot_minutes} min
                          </small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="hint" role="status">
                      Esta unidade ainda não tem quadras ativas com preço. No Admin, marque “Ativa
                      para reserva” e toque em “Salvar e liberar na reserva”.
                    </p>
                  )}
                </div>
              </fieldset>

              <fieldset
                data-booking-step="2"
                data-active={bookingStep === 2}
                tabIndex={-1}
                className={!selectedSpace ? "lk" : ""}
                disabled={!selectedSpace}
              >
                <legend className="mono">2 · Data e horários</legend>
                {datesQuery.isLoading ? (
                  <p className="hint">
                    <LoaderCircle size={16} className="loading-icon" /> Consultando dias abertos…
                  </p>
                ) : datesQuery.isError ? (
                  <p className="hint" role="alert">
                    Não foi possível consultar a agenda.
                  </p>
                ) : openDates.length ? (
                  <div className="booking-calendar">
                    <div className="booking-calendar__header">
                      <button
                        type="button"
                        className="booking-calendar__nav"
                        aria-label="Mês anterior"
                        disabled={visibleMonth <= firstCalendarMonth}
                        onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                      >
                        ‹
                      </button>
                      <strong aria-live="polite">{calendarMonthLabel(visibleMonth)}</strong>
                      <button
                        type="button"
                        className="booking-calendar__nav"
                        aria-label="Próximo mês"
                        disabled={visibleMonth >= lastCalendarMonth}
                        onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
                      >
                        ›
                      </button>
                    </div>
                    <p className="booking-calendar__range">
                      Agenda aberta até {dateLabel(addDays(todayDate, BOOKING_HORIZON_DAYS))}.
                    </p>
                    <div className="booking-calendar__weekdays" aria-hidden="true">
                      {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="booking-calendar__grid">
                      {calendarDays.map((calendarDate, index) =>
                        calendarDate ? (
                          <button
                            key={calendarDate}
                            type="button"
                            className="booking-calendar__day"
                            disabled={!openDateSet.has(calendarDate)}
                            aria-label={dateLabel(calendarDate)}
                            aria-pressed={date === calendarDate}
                            onClick={() => chooseDate(calendarDate)}
                          >
                            {Number(calendarDate.slice(-2))}
                          </button>
                        ) : (
                          <span key={`empty-${visibleMonth}-${index}`} aria-hidden="true" />
                        ),
                      )}
                    </div>
                    <p className="booking-calendar__legend">
                      Dias destacados estão abertos; os demais não têm grade disponível.
                    </p>
                  </div>
                ) : (
                  <p className="hint">Nenhum dia aberto está configurado para esta unidade.</p>
                )}
              </fieldset>

              <fieldset
                data-booking-step="2"
                data-active={bookingStep === 2}
                tabIndex={-1}
                className={!date ? "lk" : ""}
                disabled={!date}
              >
                <legend className="mono">
                  Horários · até {maxSelectableSlots} blocos (16h máx.)
                </legend>
                {availabilityQuery.isLoading ? (
                  <p className="hint">
                    <LoaderCircle size={16} className="loading-icon" /> Consultando horários…
                  </p>
                ) : availabilityQuery.isError ? (
                  <p className="hint" role="alert">
                    Não foi possível consultar este horário.
                  </p>
                ) : !date ? (
                  <p className="hint">Escolha um dia aberto acima para carregar os horários.</p>
                ) : slots.length ? (
                  <div className="opts">
                    {slots.map((slot) => {
                      const available = slot.status === "available";
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          className="opt"
                          disabled={!available}
                          aria-pressed={starts.includes(slot.start) && available}
                          onClick={() => chooseTime(slot.start)}
                        >
                          {slot.start}
                          <small>
                            {!available
                              ? "indisponível"
                              : starts.includes(slot.start)
                                ? "selecionado"
                                : "livre · selecionar"}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="hint">
                    Sem horários disponíveis para esta data. Escolha outro dia.
                  </p>
                )}
              </fieldset>

              <fieldset
                data-booking-step="3"
                data-active={bookingStep === 3}
                tabIndex={-1}
                className={!selectedSlots.length ? "lk" : ""}
                disabled={!selectedSlots.length}
              >
                <legend className="mono">4 · Seus dados</legend>
                <div className="g2 f">
                  <label>
                    <span className="mono">Nome do responsável</span>
                    <input
                      name="name"
                      required
                      minLength={3}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Nome e sobrenome"
                    />
                  </label>
                  <label>
                    <span className="mono">WhatsApp</span>
                    <input
                      name="phone"
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={30}
                      placeholder="(69) 9…"
                    />
                  </label>
                </div>
                <div className="g2 f booking-extra">
                  <label>
                    <span className="mono">CPF</span>
                    <input
                      name="cpf"
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      onChange={(event) => {
                        event.currentTarget.value = formatCpfInput(event.currentTarget.value);
                      }}
                    />
                  </label>
                  <label>
                    <span className="mono">Endereço completo</span>
                    <input
                      name="address"
                      required
                      minLength={8}
                      maxLength={250}
                      autoComplete="street-address"
                      placeholder="Rua, número, bairro e cidade"
                    />
                  </label>
                </div>
                <div className="g2 f booking-extra">
                  <label>
                    <span className="mono">Atividade principal</span>
                    <input value="Vôlei de praia" readOnly />
                  </label>
                  <label>
                    <span className="mono">Pagamento</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    >
                      {paymentMethods.map((method) => (
                        <option
                          key={method.value}
                          value={method.value}
                          disabled={
                            method.value === "pix" &&
                            paymentMode !== "demo" &&
                            paymentMode !== "infinitepay"
                          }
                        >
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full">
                    <span className="mono">Observação (opcional)</span>
                    <textarea
                      name="notes"
                      maxLength={500}
                      rows={3}
                      placeholder="Outra atividade apropriada para quadra de areia? Conte para a Arena."
                    />
                  </label>
                </div>
                <p className="hint">
                  <ShieldCheck size={15} /> Nome, WhatsApp, CPF e endereço ajudam a identificar e
                  administrar sua reserva.{" "}
                  {paymentMode === "infinitepay"
                    ? "Nome e WhatsApp podem ser pré-preenchidos no checkout. A InfinitePay ainda pode pedir confirmação de contato; CPF e endereço ficam somente com a Arena."
                    : paymentMode === "unavailable"
                      ? "O checkout online está indisponível; escolha pagamento no local."
                      : paymentMode === "demo"
                        ? "O Pix é demonstrativo, sem cobrança real."
                        : "Aguarde a verificação do pagamento online antes de selecionar Pix/cartão."}
                </p>
                {paymentConfigQuery.isError && (
                  <p role="status" className="booking-error">
                    Não foi possível verificar o checkout agora. O pagamento local continua
                    disponível; atualize a página para tentar Pix/cartão.
                  </p>
                )}
                <div className="booking-consent-block">
                  <label className="booking-consent">
                    <input type="checkbox" name="privacyConsent" required />
                    <span>
                      Autorizo o uso dos dados para administrar esta reserva. Se eu escolher
                      InfinitePay, nome e WhatsApp podem ser enviados para pré-preencher o checkout;
                      CPF e endereço não são enviados.
                    </span>
                  </label>
                  <p className="booking-privacy-copy">
                    Veja como tratamos essas informações na{" "}
                    <Link to="/privacidade">Política de Privacidade</Link>.
                  </p>
                </div>
              </fieldset>
            </div>

            <nav className="booking-mobile-controls" aria-label="Etapas da reserva">
              <div className="booking-mobile-controls__progress">
                <span>Etapa {bookingStep} de 3</span>
                <div aria-hidden="true">
                  {[1, 2, 3].map((step) => (
                    <i key={step} data-complete={step <= bookingStep} />
                  ))}
                </div>
              </div>
              {error && (
                <p className="booking-error" role="alert">
                  {error}
                </p>
              )}
              <p className="booking-mobile-controls__summary">
                {selectedSpace?.name ?? "Escolha uma quadra"}
                {selectedSlots.length ? ` · ${formatDuration(selectedDurationMinutes)}` : ""}
                <strong>{formatBRL(totalCents)}</strong>
              </p>
              <div className="booking-mobile-controls__actions">
                {bookingStep > 1 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => goToBookingStep(bookingStep - 1)}
                  >
                    Voltar
                  </button>
                )}
                {bookingStep < 3 ? (
                  <button
                    type="button"
                    className="btn pri lg"
                    disabled={
                      (bookingStep === 1 && !selectedSpace) ||
                      (bookingStep === 2 && (!date || !selectedSlots.length))
                    }
                    onClick={continueBookingStep}
                  >
                    {bookingStep === 1 ? "Escolher dia e horários" : "Continuar com meus dados"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn pri lg"
                    disabled={
                      busy ||
                      (paymentMethod === "pix" &&
                        paymentMode !== "demo" &&
                        paymentMode !== "infinitepay")
                    }
                  >
                    {busy ? "Registrando…" : "Concluir reserva"}
                  </button>
                )}
              </div>
            </nav>

            <aside className="rs booking-desktop-summary" aria-live="polite">
              <span className="mono">Resumo</span>
              <h3>{unit.name}</h3>
              <p>{unit.address}</p>
              <div className="summaryline">
                <span>Quadra</span>
                <b>{selectedSpace?.name ?? "Escolha uma quadra"}</b>
              </div>
              <div className="summaryline">
                <span>Dia</span>
                <b>{date ? dateLabel(date) : "Escolha uma data"}</b>
              </div>
              <div className="summaryline">
                <span>Duração selecionada</span>
                <b>
                  {selectedSlots.length
                    ? `${formatDuration(selectedDurationMinutes)} (${selectedSlots.length} ${selectedSlots.length === 1 ? "bloco" : "blocos"}) · ${selectedSlots.map(formatSlot).join(", ")}`
                    : "Selecione um ou mais horários"}
                </b>
              </div>
              <div className="summarytotal">
                <span>
                  Total da reserva
                  {selectedSlots.length
                    ? ` · ${formatDuration(selectedDurationMinutes)} · ${formatBRL(appliedHourlyRateCents)}/h${pricing?.promoApplied ? " promocional" : ""}`
                    : ""}
                </span>
                <b>{formatBRL(totalCents)}</b>
              </div>
              {error && (
                <p className="booking-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn pri lg"
                type="submit"
                disabled={
                  !selectedSlots.length ||
                  busy ||
                  (paymentMethod === "pix" &&
                    paymentMode !== "demo" &&
                    paymentMode !== "infinitepay")
                }
              >
                {busy ? (
                  <>
                    <LoaderCircle size={17} className="loading-icon" /> Registrando…
                  </>
                ) : (
                  "Concluir reserva"
                )}
              </button>
              <small className="mono">A reserva é registrada online. O WhatsApp é opcional.</small>
              {!selectedSpace && (
                <a
                  className="mono booking-help"
                  href={waLink(
                    "Olá! Gostaria de saber quando os horários da Arena Leste estarão disponíveis.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tirar dúvida pelo WhatsApp ↗
                </a>
              )}
            </aside>
          </form>
        )}
        <dialog
          ref={cancellationDialogRef}
          className="booking-cancel-dialog"
          aria-labelledby="booking-cancel-title"
          aria-describedby="booking-cancel-description"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            setCancellationDialogOpen(false);
          }}
          onClose={() => setCancellationDialogOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setCancellationDialogOpen(false);
          }}
        >
          <span className="mono">ATENÇÃO · CANCELAMENTO</span>
          <h2 id="booking-cancel-title">Antes de confirmar</h2>
          <p id="booking-cancel-description">
            O cancelamento só pode ser solicitado até <strong>15 horas antes</strong> do primeiro
            horário da reserva. Depois desse prazo, não será permitido cancelar.
          </p>
          <div className="booking-payment-dialog__actions">
            <button type="button" className="btn" onClick={() => setCancellationDialogOpen(false)}>
              Voltar
            </button>
            <button
              type="button"
              className="btn pri lg"
              autoFocus
              onClick={continueAfterCancellationNotice}
            >
              Entendi, continuar
            </button>
          </div>
        </dialog>
        <dialog
          ref={paymentDialogRef}
          className="booking-payment-dialog"
          aria-labelledby="booking-payment-title"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setPaymentDialogOpen(false);
          }}
          onClose={() => setPaymentDialogOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) setPaymentDialogOpen(false);
          }}
        >
          <div className="booking-payment-dialog__top">
            <span className="mono">Última etapa · pagamento seguro</span>
            <button
              type="button"
              className="booking-payment-dialog__close"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={busy}
              aria-label="Fechar escolha de pagamento"
            >
              ×
            </button>
          </div>
          <h2 id="booking-payment-title">Como prefere pagar?</h2>
          <p className="booking-payment-dialog__intro">
            {formatDuration(selectedDurationMinutes)} · Total da reserva:{" "}
            <strong>{formatBRL(totalCents)}</strong>
          </p>
          <fieldset className="booking-payment-choices" disabled={busy || paymentPlanLocked}>
            <legend className="sr-only">Escolha quanto pagar agora</legend>
            <label className="booking-payment-choice">
              <input
                type="radio"
                name="booking-payment-plan"
                value="deposit_30"
                checked={paymentPlan === "deposit_30"}
                onChange={() => setPaymentPlan("deposit_30")}
              />
              <span>
                <strong>Entrada · 30%</strong>
                <b>{formatBRL(initialPaymentCents(totalCents, "deposit_30"))}</b>
                <small>
                  Saldo após a entrada:{" "}
                  {formatBRL(totalCents - initialPaymentCents(totalCents, "deposit_30"))}
                </small>
              </span>
            </label>
            <label className="booking-payment-choice">
              <input
                type="radio"
                name="booking-payment-plan"
                value="full"
                checked={paymentPlan === "full"}
                onChange={() => setPaymentPlan("full")}
              />
              <span>
                <strong>Pagar valor integral</strong>
                <b>{formatBRL(totalCents)}</b>
                <small>Quita o total da reserva nesta cobrança.</small>
              </span>
            </label>
          </fieldset>
          <p className="booking-payment-dialog__note">
            A cobrança de {formatBRL(chargeCents)} será gerada pela InfinitePay.
            {balanceDueCents > 0
              ? ` O saldo de ${formatBRL(balanceDueCents)} não será incluído nesta cobrança inicial.`
              : " Esta opção paga o total informado."}
          </p>
          {paymentPlanLocked && (
            <p className="booking-payment-dialog__note">
              A reserva já foi registrada com este plano. Mantenha a mesma opção para tentar abrir o
              checkout novamente.
            </p>
          )}
          {error && (
            <p className="booking-error" role="alert">
              {error}
            </p>
          )}
          <div className="booking-payment-dialog__actions">
            <button
              type="button"
              className="btn"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={busy}
            >
              Voltar
            </button>
            <button
              type="button"
              className="btn pri lg"
              disabled={busy || !pendingDraft}
              onClick={() => pendingDraft && void submitDraft(pendingDraft, paymentPlan)}
            >
              {busy ? (
                <>
                  <LoaderCircle size={17} className="loading-icon" /> Preparando checkout…
                </>
              ) : (
                `Seguir para pagamento · ${formatBRL(chargeCents)}`
              )}
            </button>
          </div>
        </dialog>
        <dialog
          ref={promoDialogRef}
          className="booking-promo-dialog"
          aria-labelledby="booking-promo-title"
          aria-describedby="booking-promo-description"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            closePromo();
          }}
          onClose={dismissPromo}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePromo();
          }}
        >
          <button
            type="button"
            className="booking-promo-dialog__close"
            aria-label="Fechar promoção"
            onClick={closePromo}
          >
            <X size={19} aria-hidden="true" />
          </button>
          <span className="booking-promo-dialog__stamp" aria-hidden="true">
            {promoAvailable ? `${formatBRL(promoHourlyRateCents)} / hora` : "TARIFA DA QUADRA"}
          </span>
          <span className="mono">ARENA LESTE · VANTAGEM DESBLOQUEADA</span>
          <h2 id="booking-promo-title">{promoAvailable ? "PROMOÇÃO LIBERADA" : "MENOR TARIFA"}</h2>
          <p id="booking-promo-description">
            {!selectedSpace
              ? "Mais de 1h? R$50/h nas quadras elegíveis. Reserve e economize."
              : promoAvailable
                ? `Mais de 1h: ${formatBRL(promoHourlyRateCents)}/h. Reserve agora e economize.`
                : `Esta quadra já custa ${formatBRL(regularHourlyRateCents)}/h. Você já paga menos.`}
          </p>
          <button
            type="button"
            className="btn pri lg booking-promo-dialog__ok"
            autoFocus
            onClick={closePromo}
          >
            OK
          </button>
        </dialog>
      </main>
    </div>
  );
}

function BookingConfirmation({
  booking,
  onNewBooking,
  helpMessage,
}: {
  booking: BookingResult;
  onNewBooking: () => void;
  helpMessage: string;
}) {
  const [copied, setCopied] = useState(false);
  const date = dateLabel(booking.date);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(booking.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="okp" role="status">
      <span className="ck" aria-hidden="true">
        <Check size={34} />
      </span>
      <h2>
        Bora pra <b>areia!</b>
      </h2>
      <p>
        <strong>{booking.space}</strong>
        <br />
        {date} · {booking.slots.map(formatSlot).join(", ")}
      </p>
      <p className="hint">
        {booking.checkoutUrl
          ? "Sua reserva está aguardando a confirmação da cobrança pela InfinitePay. Guarde o código; o retorno do checkout será validado pelo servidor."
          : booking.method === "pix" && booking.pixSimulated
            ? "Sua solicitação foi registrada em modo demonstrativo; este código não confirma pagamento."
            : "Sua solicitação foi registrada online. Guarde o código e aguarde a confirmação da equipe."}
      </p>
      <div className="booking-confirm-meta">
        <div>
          <span className="mono">Código da reserva</span>
          <b>{booking.code}</b>
          <button
            className="ic"
            type="button"
            onClick={copyCode}
            aria-label="Copiar código da reserva"
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
        </div>
        <div>
          <span className="mono">Total da reserva</span>
          <b>{formatBRL(booking.amount)}</b>
        </div>
      </div>
      {booking.method === "pix" && booking.paymentPlan === "deposit_30" && (
        <div className="booking-confirm-meta">
          <div>
            <span className="mono">Cobrança inicial · 30%</span>
            <b>{formatBRL(booking.chargeAmount)}</b>
          </div>
          <div>
            <span className="mono">Saldo restante</span>
            <b>{formatBRL(booking.balanceDue)}</b>
          </div>
        </div>
      )}
      {booking.promoApplied && (
        <p className="booking-promo-applied">Promoção aplicada: R$ 50 por hora.</p>
      )}
      {booking.method === "pix" && booking.pixSimulated && booking.pixPayload && (
        <div className="pix-note">
          <strong>Pix demonstrativo — sem cobrança real</strong>
          <p>
            Este site não conecta a banco ou processador. Confirme o pagamento diretamente com a
            Arena.
          </p>
          <code>{booking.pixPayload}</code>
        </div>
      )}
      {booking.checkoutUrl && (
        <a className="btn pri lg mt-4" href={booking.checkoutUrl} rel="noopener noreferrer">
          Continuar para Pix ou cartão na InfinitePay
        </a>
      )}
      <div className="bt">
        <a
          className="btn pri lg"
          href={waLink(helpMessage)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={17} /> Avisar a equipe pelo WhatsApp
        </a>
        <button className="btn lg" type="button" onClick={onNewBooking}>
          <Ticket size={17} /> Nova reserva
        </button>
      </div>
    </section>
  );
}
