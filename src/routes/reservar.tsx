import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, MessageCircle, ShieldCheck, Ticket } from "lucide-react";
import { SITE, waLink } from "@/lib/site";
import {
  createBooking,
  getAvailability,
  getPublicBookingDates,
  getSpaces,
} from "@/lib/arena.functions";
import { ARENA_TZ, arenaNow, formatBRL, type PaymentMethod } from "@/lib/arena-rules";

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
function shortWeekday(dateISO: string) {
  if (dateISO === arenaNow().date) return "Hoje";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: ARENA_TZ })
    .format(new Date(`${dateISO}T12:00:00Z`))
    .replace(".", "");
}
function formatSlot(slot: { start: string; end: string }) {
  return `${slot.start.slice(0, 5)} – ${slot.end.slice(0, 5)}`;
}

export const Route = createFileRoute("/reservar")({
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
        content: "Agendamento online para as oito quadras de areia das duas unidades.",
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
  const fetchDates = useServerFn(getPublicBookingDates);
  const fetchAvailability = useServerFn(getAvailability);
  const submitBooking = useServerFn(createBooking);
  const queryClient = useQueryClient();
  const [unitId, setUnitId] = useState<UnitId>(search.unit ?? "unidade-1");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [idempotencyKey, setIdempotencyKey] = useState(() => globalThis.crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);

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
  const openDates = datesQuery.data ?? [];
  const availabilityQuery = useQuery({
    queryKey: ["booking-availability", spaceId, date],
    queryFn: () => fetchAvailability({ data: { spaceId: spaceId!, date: date! } }),
    enabled: Boolean(spaceId && date),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  const slots = (availabilityQuery.data ?? []) as TimeSlot[];
  const selectedSlot = slots.find((slot) => slot.start === start && slot.status === "available");
  const unit = SITE.units.find((item) => item.id === unitId)!;
  const totalCents = selectedSpace && selectedSlot ? selectedSpace.price_cents : 0;

  function resetIdempotency() {
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setError(null);
  }
  function chooseUnit(nextUnit: UnitId) {
    if (nextUnit === unitId) return;
    setUnitId(nextUnit);
    setSpaceId(null);
    setDate(null);
    setStart(null);
    resetIdempotency();
  }
  function chooseCourt(id: string) {
    if (id === spaceId) return;
    setSpaceId(id);
    setDate(null);
    setStart(null);
    resetIdempotency();
  }
  function chooseDate(nextDate: string) {
    setDate(nextDate);
    setStart(null);
    resetIdempotency();
  }
  function chooseTime(nextStart: string) {
    setStart(nextStart);
    resetIdempotency();
  }

  async function finishBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace || !date || !selectedSlot) return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitBooking({
        data: {
          unitId,
          spaceId: selectedSpace.id,
          date,
          starts: [selectedSlot.start],
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
    setUnitId(search.unit ?? "unidade-1");
    setDate(null);
    setStart(null);
    setIdempotencyKey(globalThis.crypto.randomUUID());
  }

  const contactMessage = booking
    ? `Olá! Acabei de fazer uma reserva online na ${SITE.shortName}. Código ${booking.code}; ${booking.space}; ${booking.date.split("-").reverse().join("/")} às ${formatSlot(booking.slots[0]!)}. Gostaria de tirar uma dúvida.`
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
        <h1 className="rt">
          Reserve
          <br />
          <b>sua quadra</b>
        </h1>

        {booking ? (
          <BookingConfirmation
            booking={booking}
            onNewBooking={startNewBooking}
            helpMessage={contactMessage}
          />
        ) : (
          <form className="rv" onSubmit={finishBooking}>
            <div>
              <fieldset>
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
                      <em>4 quadras de areia · Vôlei de praia</em>
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
                      As quadras desta unidade serão liberadas após a equipe cadastrar preço e
                      horários reais no painel.
                    </p>
                  )}
                </div>
              </fieldset>

              <fieldset className={!selectedSpace ? "lk" : ""} disabled={!selectedSpace}>
                <legend className="mono">2 · Dia</legend>
                {datesQuery.isLoading ? (
                  <p className="hint">
                    <LoaderCircle size={16} className="loading-icon" /> Consultando dias abertos…
                  </p>
                ) : datesQuery.isError ? (
                  <p className="hint" role="alert">
                    Não foi possível consultar a agenda.
                  </p>
                ) : openDates.length ? (
                  <div className="opts">
                    {openDates.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="opt"
                        aria-label={dateLabel(option)}
                        aria-pressed={date === option}
                        onClick={() => chooseDate(option)}
                      >
                        {shortWeekday(option)}
                        <small>
                          {option.slice(8, 10)}/{option.slice(5, 7)}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="hint">Nenhum dia aberto está configurado para esta unidade.</p>
                )}
              </fieldset>

              <fieldset className={!date ? "lk" : ""} disabled={!date}>
                <legend className="mono">3 · Horário</legend>
                {availabilityQuery.isLoading ? (
                  <p className="hint">
                    <LoaderCircle size={16} className="loading-icon" /> Consultando horários…
                  </p>
                ) : availabilityQuery.isError ? (
                  <p className="hint" role="alert">
                    Não foi possível consultar este horário.
                  </p>
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
                          aria-pressed={start === slot.start}
                          onClick={() => chooseTime(slot.start)}
                        >
                          {slot.start}
                          <small>{available ? "livre" : "indisponível"}</small>
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

              <fieldset className={!selectedSlot ? "lk" : ""} disabled={!selectedSlot}>
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
                    <span className="mono">Atividade principal</span>
                    <input value="Vôlei de praia" readOnly />
                  </label>
                  <label>
                    <span className="mono">Pagamento</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    >
                      {METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
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
                  <ShieldCheck size={15} /> Os dados são usados para registrar a reserva e permitir
                  contato da Arena. O Pix é demonstrativo, sem cobrança real.
                </p>
              </fieldset>
            </div>

            <aside className="rs" aria-live="polite">
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
                <span>Horário</span>
                <b>{selectedSlot ? formatSlot(selectedSlot) : "Selecione um horário"}</b>
              </div>
              <div className="summarytotal">
                <span>Total estimado</span>
                <b>{formatBRL(totalCents)}</b>
              </div>
              {error && (
                <p className="booking-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn pri lg" type="submit" disabled={!selectedSlot || busy}>
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
        {date} · {formatSlot(booking.slots[0]!)}
      </p>
      <p className="hint">
        Sua solicitação foi registrada online. Guarde o código e aguarde a confirmação da equipe.
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
          <span className="mono">Total estimado</span>
          <b>{formatBRL(booking.amount)}</b>
        </div>
      </div>
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
