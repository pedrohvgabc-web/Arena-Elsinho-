import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, MessageCircle, ShieldCheck, Ticket } from "lucide-react";
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
  formatBRL,
  MAX_SLOTS,
  type PaymentMethod,
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
  promoApplied: boolean;
  expiresAt: string | null;
  firstName: string;
  space: string;
  pixPayload: string | null;
  pixSimulated: boolean;
  checkoutUrl: string | null;
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
  const end = slot.end.slice(0, 5);
  return `${slot.start.slice(0, 5)} – ${end === "24:00" ? "00:00 (+1 dia)" : end}`;
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
  const [unitId, setUnitId] = useState<UnitId>(search.unit ?? "unidade-1");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [starts, setStarts] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [idempotencyKey, setIdempotencyKey] = useState(() => globalThis.crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);

  const paymentConfigQuery = useQuery({
    queryKey: ["public-payment-config"],
    queryFn: () => fetchPaymentConfig(),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const paymentMode = paymentConfigQuery.data?.mode ?? null;
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
  const totalCents = pricing?.totalCents ?? 0;

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
    setStarts([]);
    resetIdempotency();
  }
  function chooseTime(nextStart: string) {
    const selectedStarts = selectedSlots.map((slot) => slot.start);
    if (selectedStarts.includes(nextStart)) {
      setStarts(selectedStarts.filter((value) => value !== nextStart));
    } else if (selectedStarts.length >= MAX_SLOTS) {
      setError(`Você pode selecionar até ${MAX_SLOTS} horários por reserva.`);
      return;
    } else {
      setStarts([...selectedStarts, nextStart].sort());
    }
    resetIdempotency();
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
    setBusy(true);
    setError(null);
    try {
      const result = await submitBooking({
        data: {
          unitId,
          spaceId: selectedSpace.id,
          date,
          starts: selectedSlots.map((slot) => slot.start),
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          cpf,
          address,
          privacyConsent: true,
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
      const createdBooking = result.booking as BookingResult;
      setBooking(createdBooking);
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

              <div
                className="booking-promo"
                role="note"
                aria-label="Ao reservar dois horários ou mais, você paga cinquenta reais a hora. Vem aproveitar."
              >
                <span>Ao reservar</span>
                <strong>
                  2 horários
                  <br />
                  ou mais
                </strong>
                <span>você paga</span>
                <b>R$ 50</b>
                <span>a hora · Vem aproveitar!!!</span>
              </div>
              <p className="booking-promo-hint">
                O total é atualizado automaticamente ao selecionar 2 horários ou mais.
              </p>

              <fieldset className={!date ? "lk" : ""} disabled={!date}>
                <legend className="mono">3 · Horários · selecione um ou mais</legend>
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
                    ? "O pagamento abre o checkout seguro da InfinitePay; CPF e endereço não são enviados ao provedor."
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
                      Autorizo o uso dos dados que informei para registrar, confirmar e administrar
                      esta reserva.
                    </span>
                  </label>
                  <p className="booking-privacy-copy">
                    Veja como tratamos essas informações na{" "}
                    <Link to="/privacidade">Política de Privacidade</Link>.
                  </p>
                </div>
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
                <span>Horários</span>
                <b>
                  {selectedSlots.length
                    ? selectedSlots.map(formatSlot).join(", ")
                    : "Selecione um ou mais horários"}
                </b>
              </div>
              <div className="summarytotal">
                <span>
                  Total estimado
                  {selectedSlots.length
                    ? ` · ${selectedSlots.length} horário(s)${pricing?.promoApplied ? " · promoção R$ 50/h" : ""}`
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
