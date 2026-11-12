import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminCurrentBookings, adminCurrentDay, adminUpdateBooking } from "@/lib/arena.functions";
import { SITE } from "@/lib/site";
import {
  arenaNow,
  formatBRL,
  paymentProgressPercentages,
  PAYMENT_LABEL,
  STATUS_LABEL,
  verifiedPaymentAmountCents,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/arena-rules";

type UnitId = "unidade-1" | "unidade-2";
type BookingRow = {
  id: string;
  booking_code: string;
  group_code: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  phone: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  provider_payment_status: string | null;
  provider_capture_method: string | null;
  provider_amount_cents: number | null;
  amount_cents: number;
  notes: string | null;
  space_id: string;
  created_at: string;
  space_name: string;
  unit_id: UnitId;
};
type BookingGroup = {
  id: string;
  code: string;
  date: string;
  name: string;
  phone: string;
  unitId: UnitId;
  spaceName: string;
  paymentLabel: string;
  status: PaymentStatus;
  paymentNeedsReview: boolean;
  amountCents: number;
  chargeAmountCents: number;
  expectedBalanceDueCents: number;
  balanceDueCents: number;
  receivedAmountCents: number;
  slots: Array<{ start: string; end: string }>;
};

const BADGE: Record<PaymentStatus, string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
};

function shiftDate(iso: string, amount: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatSlotRanges(slots: Array<{ start: string; end: string }>) {
  const ranges: Array<[string, string]> = [];
  for (const slot of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const start = slot.start.slice(0, 5);
    const end = slot.end.slice(0, 5);
    const previous = ranges.at(-1);
    if (previous && previous[1] === start) previous[1] = end;
    else ranges.push([start, end]);
  }
  return ranges
    .map(([start, end]) => `${start} – ${end === "24:00" ? "00:00 (+1 dia)" : end}`)
    .join(" · ");
}

function groupBookings(rows: BookingRow[]): BookingGroup[] {
  const grouped = new Map<string, BookingRow[]>();
  for (const row of rows) {
    const key = row.group_code || row.booking_code;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return [...grouped.entries()]
    .map(([code, items]) => {
      const first = items[0]!;
      const unitNumber = first.unit_id === "unidade-1" ? 1 : 2;
      const statuses = items.map((row) => row.payment_status);
      const status: PaymentStatus = statuses.every((value) => value === "paid")
        ? "paid"
        : statuses.includes("pending")
          ? "pending"
          : statuses.includes("expired")
            ? "expired"
            : statuses.includes("cancelled")
              ? "cancelled"
              : statuses.includes("failed")
                ? "failed"
                : first.payment_status;
      const paymentNeedsReview =
        first.payment_provider === "infinitepay" &&
        items.some((row) => row.provider_payment_status === "paid") &&
        status !== "paid";
      const captureMethod =
        items.find((row) => row.provider_capture_method)?.provider_capture_method ?? null;
      const paymentLabel =
        first.payment_provider === "infinitepay"
          ? captureMethod === "pix"
            ? "Pix · InfinitePay"
            : captureMethod === "credit_card"
              ? "Cartão · InfinitePay"
              : "Pix ou cartão · InfinitePay"
          : PAYMENT_LABEL[first.payment_method];
      const amountCents = items.reduce((sum, row) => sum + Number(row.amount_cents), 0);
      const chargeAmountCents = items.reduce(
        (sum, row) => sum + Number(row.provider_amount_cents ?? 0),
        0,
      );
      const receivedAmountCents = verifiedPaymentAmountCents(
        items.map((row) => ({
          provider: row.payment_provider,
          providerStatus: row.provider_payment_status,
          bookingStatus: row.payment_status,
          amountCents: row.provider_amount_cents,
        })),
      );
      const expectedBalanceDueCents = Math.max(0, amountCents - chargeAmountCents);
      const balanceDueCents =
        first.payment_provider === "infinitepay"
          ? Math.max(0, amountCents - receivedAmountCents)
          : expectedBalanceDueCents;
      return {
        id: first.id,
        code,
        date: first.booking_date,
        name: first.customer_name,
        phone: first.phone,
        unitId: first.unit_id,
        spaceName: `Unidade ${unitNumber} · ${first.space_name}`,
        paymentLabel,
        status,
        paymentNeedsReview,
        amountCents,
        chargeAmountCents,
        expectedBalanceDueCents,
        balanceDueCents,
        receivedAmountCents,
        slots: items.map((row) => ({ start: row.start_time, end: row.end_time })),
      };
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.slots[0]!.start.localeCompare(b.slots[0]!.start),
    );
}

function formatBookingDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(" de ", " ");
}

export function CurrentBookingsAdmin({ view = "agenda" }: { view?: "agenda" | "reservations" }) {
  const fetchCurrentDay = useServerFn(adminCurrentDay);
  const fetchCurrentBookings = useServerFn(adminCurrentBookings);
  const updateBooking = useServerFn(adminUpdateBooking);
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => arenaNow().date);
  const [working, setWorking] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const rangeStart = arenaNow().date;
  const rangeEnd = shiftDate(rangeStart, 60);
  const query = useQuery({
    queryKey:
      view === "agenda"
        ? ["admin-current-day", date]
        : ["admin-current-bookings", rangeStart, rangeEnd],
    queryFn: () =>
      view === "agenda"
        ? fetchCurrentDay({ data: { date } })
        : fetchCurrentBookings({ data: { fromDate: rangeStart, toDate: rangeEnd } }),
    retry: false,
    refetchInterval: 30_000,
  });
  const groups = useMemo(
    () => groupBookings((query.data?.bookings ?? []) as BookingRow[]),
    [query.data?.bookings],
  );
  const attentionRequired = groups.filter(
    (booking) => booking.status === "pending" || booking.paymentNeedsReview,
  ).length;
  const confirmed = groups.filter((booking) => booking.status === "paid").length;
  const paidAmount = groups.reduce((sum, booking) => sum + booking.receivedAmountCents, 0);
  const filteredGroups = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase("pt-BR");
    return groups.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (!term) return true;
      return [
        booking.name,
        booking.phone,
        booking.code,
        booking.spaceName,
        formatSlotRanges(booking.slots),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [groups, searchText, statusFilter]);

  async function act(
    booking: BookingGroup,
    action: "mark_paid" | "cancel" | "confirm_received_payment",
  ) {
    const question =
      action === "mark_paid"
        ? "Confirmar manualmente o pagamento desta reserva e de todos os horários do grupo?"
        : action === "confirm_received_payment"
          ? "A InfinitePay confirmou o pagamento. Verifique na InfinitePay se a cobrança não foi estornada e confira se os horários seguem livres; confirmar bloqueará novamente as quadras. Continuar?"
          : "Cancelar esta reserva e liberar todos os horários do grupo? Esta ação não estorna pagamentos; faça eventual estorno diretamente na InfinitePay.";
    if (!window.confirm(question)) return;
    setWorking(booking.code);
    try {
      const result = await updateBooking({ data: { id: booking.id, action } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        action === "mark_paid"
          ? "Reserva confirmada."
          : action === "confirm_received_payment"
            ? "Reserva confirmada após revisão do pagamento."
            : "Reserva cancelada.",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-current-day"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-current-bookings"] });
    } catch {
      toast.error("Não foi possível atualizar esta reserva.");
    } finally {
      setWorking(null);
    }
  }

  const dateText = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <section
      className="mt-8 overflow-hidden rounded-3xl border border-border bg-card/45"
      aria-labelledby="current-bookings-heading"
    >
      <div className="border-b border-border px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              {view === "agenda" ? "Agenda diária" : "Gestão de reservas"}
            </p>
            <h2
              id="current-bookings-heading"
              className="mt-1 font-display text-3xl font-bold uppercase"
            >
              {view === "agenda" ? "Agenda" : "Reservas online"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === "agenda"
                ? "Acompanhe as reservas do dia por unidade, quadra e horário."
                : "Pesquise e filtre as reservas online dos próximos 60 dias."}
            </p>
          </div>
          {view === "agenda" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate((current) => shiftDate(current, -1))}
                aria-label="Dia anterior"
                className="grid h-11 w-11 place-items-center rounded-lg border border-border hover:border-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                aria-label="Data das reservas"
                value={date}
                onChange={(event) => event.target.value && setDate(event.target.value)}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => setDate((current) => shiftDate(current, 1))}
                aria-label="Próximo dia"
                className="grid h-11 w-11 place-items-center rounded-lg border border-border hover:border-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDate(arenaNow().date)}
                className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold hover:border-primary"
              >
                Hoje
              </button>
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">
              {formatBookingDate(rangeStart)} — {formatBookingDate(rangeEnd)}
            </p>
          )}
        </div>
      </div>
      <div className="p-5 sm:p-7">
        {view === "agenda" && (
          <p className="mb-4 text-sm font-semibold capitalize text-muted-foreground">{dateText}</p>
        )}
        {query.isLoading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando reservas…
          </p>
        ) : query.isError ? (
          <p
            role="alert"
            className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning"
          >
            Não foi possível carregar as reservas atuais. Atualize a página ou tente novamente.
          </p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Reservas", String(groups.length)],
                ["Aguardando pagamento/revisão", String(attentionRequired)],
                ["Confirmadas", String(confirmed)],
                ["Recebido · verificado", formatBRL(paidAmount)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-background p-3 sm:p-4"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-display text-xl font-bold sm:text-2xl">{value}</p>
                </div>
              ))}
            </div>
            {view === "reservations" && (
              <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Buscar reservas
                  <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
                    <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <input
                      type="search"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Nome, telefone, código ou quadra"
                      className="min-w-0 flex-1 bg-transparent text-sm font-normal normal-case tracking-normal outline-none"
                    />
                  </span>
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as PaymentStatus | "all")
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal"
                  >
                    <option value="all">Todos os status</option>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
              Mostrando {filteredGroups.length} de {groups.length} reservas{" "}
              {view === "agenda" ? "nesta data" : "neste período"}.
            </p>
            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
                <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-semibold">
                  Nenhuma reserva online {view === "agenda" ? "nesta data" : "neste período"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  As reservas das duas unidades aparecerão aqui depois de concluídas.
                </p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma reserva corresponde à busca ou ao status selecionado.
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredGroups.map((booking) => {
                  const unit = SITE.units.find((item) => item.id === booking.unitId);
                  const paymentProgress = paymentProgressPercentages(
                    booking.amountCents,
                    booking.receivedAmountCents,
                  );
                  const statusLabel = booking.paymentNeedsReview
                    ? "Pagamento recebido · revisar"
                    : booking.paymentLabel.includes("InfinitePay") &&
                        booking.status === "paid" &&
                        booking.balanceDueCents > 0
                      ? `Falta pagar ${paymentProgress.remainingPercentage}%`
                      : STATUS_LABEL[booking.status];
                  const message = `Olá, ${booking.name.split(" ")[0]}! Sobre sua reserva ${booking.code} na ${unit?.name ?? "Arena Leste"}, ${booking.date.split("-").reverse().join("/")} às ${formatSlotRanges(booking.slots)}.`;
                  return (
                    <li
                      key={booking.code}
                      className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{booking.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {view === "reservations" ? `${formatBookingDate(booking.date)} · ` : ""}
                            {booking.spaceName} · {formatSlotRanges(booking.slots)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {booking.phone} · {booking.paymentLabel} · Código {booking.code}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE[booking.status]}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {booking.paymentNeedsReview && (
                        <p
                          role="alert"
                          className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning"
                        >
                          Pagamento recebido, mas a reserva não foi confirmada automaticamente. Use
                          a confirmação após revisão somente se o horário ainda não terminou e
                          continua livre; caso contrário, contate o cliente e trate eventual estorno
                          na InfinitePay.
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <div>
                          <strong className="font-display text-xl">
                            Reserva: {formatBRL(booking.amountCents)}
                          </strong>
                          {booking.paymentLabel.includes("InfinitePay") ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {booking.receivedAmountCents > 0
                                ? `${booking.paymentNeedsReview ? "Pagamento recebido · revisão necessária" : `Recebido ${paymentProgress.receivedPercentage}%`}: ${formatBRL(booking.receivedAmountCents)}${booking.balanceDueCents > 0 ? ` · Falta pagar ${paymentProgress.remainingPercentage}% do valor da reserva: ${formatBRL(booking.balanceDueCents)}` : " · Pago integralmente"}`
                                : `Cobrança pendente: ${formatBRL(booking.chargeAmountCents)} · total: ${formatBRL(booking.amountCents)} · após a cobrança, restará ${formatBRL(booking.expectedBalanceDueCents)}`}
                            </p>
                          ) : booking.balanceDueCents > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {booking.receivedAmountCents > 0
                                ? "Entrada recebida"
                                : "Entrada no checkout"}
                              : {formatBRL(booking.chargeAmountCents)} · saldo:{" "}
                              {formatBRL(booking.balanceDueCents)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://wa.me/55${booking.phone}?text=${encodeURIComponent(message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary"
                          >
                            <MessageCircle className="h-4 w-4" /> Contatar
                          </a>
                          {booking.paymentNeedsReview && (
                            <button
                              type="button"
                              disabled={working === booking.code}
                              onClick={() => act(booking, "confirm_received_payment")}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-success px-4 text-sm font-bold text-success-foreground disabled:opacity-50"
                            >
                              {working === booking.code ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}{" "}
                              Confirmar reserva após revisão
                            </button>
                          )}
                          {booking.status === "pending" && !booking.paymentNeedsReview && (
                            <button
                              type="button"
                              disabled={working === booking.code}
                              onClick={() => act(booking, "mark_paid")}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-success px-4 text-sm font-bold text-success-foreground disabled:opacity-50"
                            >
                              {working === booking.code ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}{" "}
                              Confirmar pagamento
                            </button>
                          )}
                          {(booking.status === "pending" || booking.status === "paid") && (
                            <button
                              type="button"
                              disabled={working === booking.code}
                              onClick={() => act(booking, "cancel")}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" /> Cancelar grupo
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
