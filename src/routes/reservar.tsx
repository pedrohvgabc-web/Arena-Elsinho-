import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SITE, waLink } from "@/lib/site";
import { createBooking, getAvailability, getSpaces } from "@/lib/arena.functions";
import { ARENA_TZ, arenaNow, formatBRL, MAX_SLOTS, type PaymentMethod } from "@/lib/arena-rules";

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
  expiresAt: string | null;
  firstName: string;
  space: string;
  pixPayload: string | null;
  pixSimulated: boolean;
};

const UNIT_IDS: UnitId[] = ["unidade-1", "unidade-2"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const METHODS: Array<{ value: PaymentMethod; label: string; detail: string }> = [
  { value: "pix", label: "Pix demonstrativo", detail: "Sem cobrança real nesta versão" },
  { value: "card_onsite", label: "Cartão no local", detail: "Pagamento diretamente na Arena" },
  { value: "cash_onsite", label: "Dinheiro no local", detail: "Pagamento diretamente na Arena" },
];

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayInArena() {
  return arenaNow().date;
}

function dateLabel(iso: string) {
  const [year = 2000, month = 1, day = 1] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatSlotRanges(slots: Array<{ start: string; end: string }>) {
  const ranges: Array<[string, string]> = [];
  for (const slot of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const previous = ranges.at(-1);
    if (previous && previous[1] === slot.start) previous[1] = slot.end;
    else ranges.push([slot.start, slot.end]);
  }
  return ranges.map(([start, end]) => `${start} – ${end}`).join(" · ");
}

export const Route = createFileRoute("/reservar")({
  validateSearch: (search: Record<string, unknown>) => ({
    unit: UNIT_IDS.includes(search["unit"] as UnitId) ? (search["unit"] as UnitId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Agende sua quadra — Arena Leste Multi Sports" },
      {
        name: "description",
        content:
          "Escolha a unidade, quadra, data e horários. Faça sua reserva online na Arena Leste em Porto Velho.",
      },
      { property: "og:title", content: "Agende sua quadra — Arena Leste" },
      {
        property: "og:description",
        content: "Consulte horários e reserve uma das oito quadras de areia das duas unidades.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: Reservar,
});

function Reservar() {
  const search = Route.useSearch();
  const fetchSpaces = useServerFn(getSpaces);
  const fetchAvailability = useServerFn(getAvailability);
  const submitBooking = useServerFn(createBooking);
  const queryClient = useQueryClient();
  const [unitId, setUnitId] = useState<UnitId>(search.unit ?? "unidade-1");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState(todayInArena);
  const [selectedStarts, setSelectedStarts] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => globalThis.crypto.randomUUID());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year = 2026, month = 1] = todayInArena().split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1, 12));
  });

  const spacesQuery = useQuery({
    queryKey: ["booking-spaces"],
    queryFn: () => fetchSpaces(),
    staleTime: 30_000,
  });
  const spaces = useMemo(() => (spacesQuery.data ?? []) as Space[], [spacesQuery.data]);
  const unitSpaces = useMemo(
    () => spaces.filter((space) => space.unit_id === unitId),
    [spaces, unitId],
  );
  const selectedSpace = spaces.find((space) => space.id === spaceId) ?? null;

  useEffect(() => {
    if (!unitSpaces.length) {
      setSpaceId(null);
      setSelectedStarts([]);
      return;
    }
    if (!unitSpaces.some((space) => space.id === spaceId)) {
      setSpaceId(unitSpaces[0]!.id);
      setSelectedStarts([]);
    }
  }, [unitSpaces, spaceId]);

  const availabilityQuery = useQuery({
    queryKey: ["booking-availability", spaceId, date],
    queryFn: () => fetchAvailability({ data: { spaceId: spaceId!, date } }),
    enabled: Boolean(spaceId) && (step === 2 || step === 3),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  const slots = (availabilityQuery.data ?? []) as TimeSlot[];
  const amountCents = (selectedSpace?.price_cents ?? 0) * selectedStarts.length;

  const year = calendarMonth.getUTCFullYear();
  const month = calendarMonth.getUTCMonth();
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const today = todayInArena();
  const calendarTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(calendarMonth);
  const calendarCells = [
    ...Array.from({ length: firstOffset }, (_, index) => ({
      key: `blank-${index}`,
      date: null as string | null,
      day: null as number | null,
    })),
    ...Array.from({ length: dayCount }, (_, index) => ({
      key: `day-${index + 1}`,
      date: makeDateKey(year, month, index + 1),
      day: index + 1,
    })),
  ];

  function chooseUnit(nextUnit: UnitId) {
    if (nextUnit === unitId) return;
    setUnitId(nextUnit);
    setSelectedStarts([]);
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setError(null);
  }

  function toggleStart(start: string) {
    if (!selectedStarts.includes(start) && selectedStarts.length >= MAX_SLOTS) {
      setError(`Você pode escolher até ${MAX_SLOTS} horários por reserva.`);
      return;
    }
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setSelectedStarts((current) => {
      if (current.includes(start)) return current.filter((item) => item !== start);
      setError(null);
      return [...current, start].sort();
    });
  }

  async function finishBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace || !selectedStarts.length) return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitBooking({
        data: {
          unitId,
          spaceId: selectedSpace.id,
          date,
          starts: selectedStarts,
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          notes: String(form.get("notes") ?? ""),
          method: paymentMethod,
          idempotencyKey,
        },
      });
      if (!result.ok) {
        setError(result.error);
        await queryClient.invalidateQueries({ queryKey: ["booking-availability", spaceId, date] });
        return;
      }
      setBooking(result.booking as BookingResult);
    } catch {
      setError("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function startNewBooking() {
    setBooking(null);
    setSelectedStarts([]);
    setStep(1);
    setIdempotencyKey(globalThis.crypto.randomUUID());
    const currentDate = todayInArena();
    setDate(currentDate);
    const [year = 2026, month = 1] = currentDate.split("-").map(Number);
    setCalendarMonth(new Date(Date.UTC(year, month - 1, 1, 12)));
  }

  const unit = SITE.units.find((item) => item.id === unitId)!;
  const selectedMethodLabel =
    METHODS.find((method) => method.value === booking?.method)?.label ?? "Pagamento";
  const helpMessage = booking
    ? `Olá! Acabei de fazer uma reserva online na ${SITE.shortName}. Código ${booking.code}; ${booking.space}; ${booking.date.split("-").reverse().join("/")} às ${formatSlotRanges(booking.slots)}. Gostaria de tirar uma dúvida.`
    : "";

  return (
    <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14">
      <Link
        to="/"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao início
      </Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> Reserva online · Porto Velho
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.88] sm:text-7xl">
            Marque seu jogo.
            <br />
            <span className="text-primary">A areia espera.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Escolha unidade, quadra, dia e horário. Você faz a reserva aqui mesmo, sem começar pelo
            WhatsApp.
          </p>

          <div
            className="mt-8 grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2"
            role="group"
            aria-label="Etapas da reserva"
          >
            {[
              {
                label: "Quadra",
                active: !booking && step === 1,
                done: Boolean(booking) || step > 1,
              },
              { label: "Dia", active: !booking && step === 2, done: Boolean(booking) || step > 2 },
              {
                label: "Horário",
                active: !booking && step === 3,
                done: Boolean(booking) || step > 3,
              },
              { label: "Dados", active: !booking && step === 4, done: Boolean(booking) },
            ].map((item, index) => (
              <div
                key={item.label}
                aria-current={item.active ? "step" : undefined}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2 sm:text-left"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold sm:h-8 sm:w-8 ${item.done ? "bg-success text-success-foreground" : item.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {item.done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={`text-[11px] font-semibold leading-tight sm:text-sm ${item.active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {item.label}
                </span>
                {index < 3 && (
                  <span
                    className="mx-1 hidden h-px w-5 bg-border sm:block sm:w-8"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>

          {spacesQuery.isLoading ? (
            <div className="mt-8 flex min-h-52 items-center justify-center gap-3 rounded-3xl border border-border bg-card/40 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando quadras disponíveis…
            </div>
          ) : spacesQuery.isError ? (
            <div
              className="mt-8 rounded-3xl border border-warning/40 bg-warning/10 p-6 text-sm leading-relaxed text-warning"
              role="alert"
            >
              Não foi possível consultar as quadras neste momento. Tente novamente em instantes ou
              fale com a Arena pelo WhatsApp.
            </div>
          ) : spaces.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-border bg-card/50 p-6 sm:p-8">
              <h2 className="font-display text-3xl font-bold uppercase">
                Reservas em configuração
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A equipe está cadastrando os horários e valores das duas unidades. Assim que a grade
                for liberada, você poderá concluir o agendamento nesta página.
              </p>
              <a
                href={waLink(
                  "Olá! Gostaria de saber quando o agendamento online da Arena Leste estará disponível.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" /> Tirar dúvida pelo WhatsApp
              </a>
            </div>
          ) : booking ? (
            <BookingConfirmation
              booking={booking}
              paymentLabel={selectedMethodLabel}
              onNewBooking={startNewBooking}
              helpMessage={helpMessage}
            />
          ) : step === 4 ? (
            <form
              key="booking-details"
              onSubmit={finishBooking}
              className="animate-pop mt-8 rounded-3xl border border-border bg-card/50 p-5 sm:p-8"
            >
              <button
                type="button"
                onClick={() => {
                  setStep(3);
                  setIdempotencyKey(globalThis.crypto.randomUUID());
                  setError(null);
                }}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar aos horários
              </button>
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Etapa 4 · contato e pagamento
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">
                  Quem vai jogar?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Informe um contato para a equipe localizar a reserva se precisar.
                </p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold sm:col-span-2">
                  Nome do responsável
                  <input
                    name="name"
                    required
                    minLength={3}
                    maxLength={80}
                    autoComplete="name"
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4 font-normal"
                    placeholder="Nome e sobrenome"
                  />
                </label>
                <label className="text-sm font-semibold">
                  WhatsApp para contato
                  <input
                    name="phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4 font-normal"
                    placeholder="(69) 99999-9999"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Atividade
                  <span className="mt-1.5 flex min-h-12 items-center rounded-xl border border-input bg-background px-4 text-sm font-normal">
                    Vôlei de praia
                  </span>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  Observação <span className="font-normal text-muted-foreground">(opcional)</span>
                  <textarea
                    name="notes"
                    maxLength={500}
                    rows={3}
                    className="mt-1.5 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 font-normal"
                    placeholder="Se a equipe pretende praticar outra atividade própria de quadra de areia, conte para a Arena aqui."
                  />
                </label>
              </div>
              <fieldset className="mt-7">
                <legend className="text-sm font-bold">Como pretende pagar?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {METHODS.map((method) => (
                    <label
                      key={method.value}
                      className={`flex min-h-[76px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${paymentMethod === method.value ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        className="mt-1 accent-orange-500"
                      />
                      <span>
                        <strong className="block text-sm">{method.label}</strong>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {method.detail}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  O Pix é apenas demonstrativo nesta versão: o site não realiza uma cobrança real.
                </p>
              </fieldset>
              {error && (
                <p
                  className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="btn-jelly mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:opacity-60 sm:w-auto"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {busy ? "Registrando reserva…" : "Concluir reserva"}
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Seus dados são
                usados apenas para registrar a reserva e permitir contato da Arena.
              </p>
            </form>
          ) : (
            <section className="mt-8 space-y-7" aria-label="Etapas para reservar uma quadra">
              {step === 1 && (
                <>
                  <div>
                    <h2 className="font-display text-2xl font-bold uppercase sm:text-3xl">
                      Escolha a unidade
                    </h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {SITE.units.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={unitId === option.id}
                          onClick={() => chooseUnit(option.id as UnitId)}
                          className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${unitId === option.id ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/50"}`}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-primary">
                            <MapPin className="h-4 w-4" /> Unidade {index + 1}
                          </span>
                          <span className="mt-1 block font-display text-xl font-bold uppercase">
                            {option.name}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {option.address}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl font-bold uppercase sm:text-3xl">
                          Selecione a quadra
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Quatro quadras de areia nesta unidade.
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                        {unit.name}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {unitSpaces.map((space) => (
                        <button
                          key={space.id}
                          type="button"
                          aria-pressed={space.id === spaceId}
                          onClick={() => {
                            setSpaceId(space.id);
                            setSelectedStarts([]);
                            setIdempotencyKey(globalThis.crypto.randomUUID());
                          }}
                          className={`min-h-20 rounded-xl border p-3 text-left transition-colors ${space.id === spaceId ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/50"}`}
                        >
                          <span className="block text-xs font-semibold text-muted-foreground">
                            Vôlei de praia
                          </span>
                          <span className="mt-1 block font-display text-xl font-bold uppercase">
                            {space.name}
                          </span>
                          <span className="mt-1 block text-xs text-primary">
                            {formatBRL(space.price_cents)} · {space.slot_minutes} min
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!selectedSpace}
                      onClick={() => {
                        setStep(2);
                        setError(null);
                      }}
                      className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Escolher o dia <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}

              <div className="grid gap-5">
                {step === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar às quadras
                    </button>
                    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl font-bold uppercase">
                            Escolha o dia
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Horário local · Porto Velho
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(new Date(Date.UTC(year, month - 1, 1, 12)))
                            }
                            aria-label="Mês anterior"
                            className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:border-primary"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(new Date(Date.UTC(year, month + 1, 1, 12)))
                            }
                            aria-label="Próximo mês"
                            className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:border-primary"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-4 text-center font-semibold capitalize">{calendarTitle}</p>
                      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS.map((weekday) => (
                          <span
                            key={weekday}
                            className="py-2 text-xs font-bold text-muted-foreground"
                          >
                            {weekday}
                          </span>
                        ))}
                        {calendarCells.map((cell) => {
                          if (!cell.date || !cell.day)
                            return <span key={cell.key} aria-hidden="true" />;
                          const past = cell.date < today;
                          const active = cell.date === date;
                          return (
                            <button
                              key={cell.key}
                              type="button"
                              disabled={past}
                              aria-label={dateLabel(cell.date)}
                              aria-pressed={active}
                              onClick={() => {
                                setDate(cell.date!);
                                setSelectedStarts([]);
                                setIdempotencyKey(globalThis.crypto.randomUUID());
                                setError(null);
                              }}
                              className={`min-h-10 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${active ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 hover:text-primary"}`}
                            >
                              {cell.day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        <span className="capitalize">{dateLabel(date)}</span>
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(3);
                          setError(null);
                        }}
                        className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"
                      >
                        Consultar horários <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar à data
                    </button>
                    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl font-bold uppercase">
                            Escolha os horários
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {unit.name} · {dateLabel(date)} · até {MAX_SLOTS} horários disponíveis.
                          </p>
                        </div>
                        <Clock3 className="mt-1 h-5 w-5 text-primary" />
                      </div>
                      {availabilityQuery.isLoading ? (
                        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Consultando disponibilidade…
                        </div>
                      ) : availabilityQuery.isError ? (
                        <p
                          className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
                          role="alert"
                        >
                          Não foi possível consultar os horários. Tente novamente.
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm leading-relaxed text-muted-foreground">
                          Não há horários cadastrados para este dia. Escolha outra data ou consulte
                          a Arena pelo WhatsApp.
                        </p>
                      ) : (
                        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((slot) => {
                            const picked = selectedStarts.includes(slot.start);
                            const unavailable = slot.status !== "available";
                            const statusLabel =
                              slot.status === "pending"
                                ? "Em reserva"
                                : slot.status === "confirmed"
                                  ? "Ocupado"
                                  : slot.status === "unavailable"
                                    ? "Indisponível"
                                    : "Disponível";
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                disabled={
                                  unavailable || (!picked && selectedStarts.length >= MAX_SLOTS)
                                }
                                aria-pressed={picked}
                                title={statusLabel}
                                onClick={() => toggleStart(slot.start)}
                                className={`min-h-[68px] rounded-xl border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${picked ? "border-primary bg-primary text-primary-foreground" : unavailable ? "border-border bg-muted/60 text-muted-foreground line-through" : "border-success/40 bg-success/5 hover:border-success hover:bg-success/10"}`}
                              >
                                <span className="block font-display text-lg font-bold">
                                  {slot.start}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-semibold">
                                  {picked ? "Selecionado" : statusLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <i className="h-2.5 w-2.5 rounded-full bg-success/70" /> Livre
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="h-2.5 w-2.5 rounded-full bg-primary" /> Selecionado
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" /> Ocupado
                        </span>
                      </div>
                      {error && (
                        <p className="mt-4 text-sm text-destructive" role="alert">
                          {error}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {step === 3 && (
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
                      Resumo
                    </p>
                    <p className="mt-1 font-semibold">
                      {selectedSpace?.name ?? "Escolha uma quadra"} ·{" "}
                      {selectedStarts.length
                        ? formatSlotRanges(
                            slots.filter((slot) => selectedStarts.includes(slot.start)),
                          )
                        : "Escolha um horário"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedStarts.length
                        ? `${selectedStarts.length} horário(s) · ${formatBRL(amountCents)}`
                        : "Selecione os horários livres no calendário."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedSpace || !selectedStarts.length}
                    onClick={() => {
                      setStep(4);
                      setError(null);
                    }}
                    className="btn-jelly inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continuar para os dados <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card/45 p-4 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Arena Leste</p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase">{unit.name}</h2>
          <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {unit.address}
          </p>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Sua seleção
            </p>
            <p className="mt-2 text-sm font-semibold">
              {selectedSpace?.name ?? "Nenhuma quadra selecionada"}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{dateLabel(date)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedStarts.length
                ? formatSlotRanges(slots.filter((slot) => selectedStarts.includes(slot.start)))
                : "Nenhum horário selecionado"}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total estimado</span>
              <strong className="font-display text-2xl">{formatBRL(amountCents)}</strong>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
            A reserva é registrada online. O WhatsApp fica disponível se você quiser tirar uma
            dúvida com a equipe.
          </p>
        </aside>
      </div>
    </main>
  );
}

function BookingConfirmation({
  booking,
  paymentLabel,
  onNewBooking,
  helpMessage,
}: {
  booking: BookingResult;
  paymentLabel: string;
  onNewBooking: () => void;
  helpMessage: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const [year = 2000, month = 1, day = 1] = booking.date.split("-").map(Number);
  const friendlyDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ARENA_TZ,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));

  return (
    <section
      className="animate-pop mt-8 rounded-3xl border border-success/40 bg-success/5 p-5 sm:p-8"
      role="status"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
        <Check className="h-7 w-7" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-success">
        Reserva registrada
      </p>
      <h2 className="mt-2 font-display text-4xl font-extrabold uppercase sm:text-5xl">
        Nos vemos na areia, {booking.firstName}.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Sua solicitação ficou registrada no sistema. Guarde o código abaixo para consultar a equipe
        se precisar.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <span className="text-xs text-muted-foreground">Código</span>
          <div className="mt-1 flex items-center justify-between gap-3">
            <strong className="font-mono text-xl">{booking.code}</strong>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copiar código da reserva"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:border-primary"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <span className="text-xs text-muted-foreground">Total estimado</span>
          <strong className="mt-1 block font-display text-2xl">{formatBRL(booking.amount)}</strong>
          <span className="text-xs text-muted-foreground">{paymentLabel}</span>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <span className="text-xs text-muted-foreground">Unidade e quadra</span>
          <strong className="mt-1 block">{booking.space}</strong>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <span className="text-xs text-muted-foreground">Data e horário</span>
          <strong className="mt-1 block capitalize">{friendlyDate}</strong>
          <span className="text-sm text-muted-foreground">{formatSlotRanges(booking.slots)}</span>
        </div>
      </div>
      {booking.method === "pix" && booking.pixSimulated && booking.pixPayload && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed">
          <p className="font-bold text-warning">Pix demonstrativo — sem cobrança real</p>
          <p className="mt-1 text-muted-foreground">
            A versão atual não conecta a um banco ou processador de pagamento. Confirme o pagamento
            diretamente com a Arena.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-background p-3 text-xs text-foreground">
            {booking.pixPayload}
          </code>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={waLink(helpMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-5 font-semibold hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" /> Tirar dúvida no WhatsApp
        </a>
        <button
          type="button"
          onClick={onNewBooking}
          className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"
        >
          <Ticket className="h-4 w-4" /> Fazer outra reserva
        </button>
      </div>
    </section>
  );
}
