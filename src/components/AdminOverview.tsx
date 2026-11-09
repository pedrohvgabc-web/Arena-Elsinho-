import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Clock3, Loader2, Trophy } from "lucide-react";
import { adminDashboardSummary } from "@/lib/arena.functions";
import { ADMIN_MODULES, type AdminModuleId } from "@/lib/admin-navigation";
import { SITE } from "@/lib/site";

type Summary = {
  date: string;
  todayBookings: number;
  todayPending: number;
  activeCourts: number;
  tournamentPending: number;
  upcoming: Array<{
    booking_date: string;
    start_time: string;
    customer_name: string;
    space_name: string;
    unit_id: string;
  }>;
};

type AdminOverviewProps = {
  onNavigate: (module: AdminModuleId) => void;
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, 12)));
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const fetchSummary = useServerFn(adminDashboardSummary);
  const query = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: () => fetchSummary(),
    retry: false,
    refetchInterval: 30_000,
  });
  const data = query.data as Summary | undefined;

  return (
    <section aria-labelledby="admin-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Arena Leste · operação
          </p>
          <h2
            id="admin-overview-heading"
            className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] sm:text-5xl"
          >
            Visão geral
          </h2>
          {data && (
            <p className="mt-2 text-sm capitalize text-muted-foreground">{formatDate(data.date)}</p>
          )}
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Reservas das oito quadras atuais e pré-inscrições do torneio. O histórico antigo permanece
          separado.
        </p>
      </div>

      {query.isLoading ? (
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores…
        </p>
      ) : query.isError ? (
        <p
          className="mt-5 rounded-xl border border-warning/35 bg-warning/10 p-4 text-sm text-warning"
          role="alert"
        >
          Não foi possível carregar os indicadores. Os outros módulos do painel continuam
          disponíveis.
        </p>
      ) : data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Reservas hoje", value: String(data.todayBookings), icon: CalendarDays },
              { label: "Aguardando confirmação", value: String(data.todayPending), icon: Clock3 },
              { label: "Quadras liberadas", value: `${data.activeCourts} / 8`, icon: ArrowRight },
              {
                label: "Inscrições pendentes",
                value: String(data.tournamentPending),
                icon: Trophy,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="border-l-2 border-primary pl-4 py-3">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold leading-snug text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">
                    {item.value}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <h3 className="font-display text-2xl font-bold uppercase">Próximos horários</h3>
                <button
                  type="button"
                  onClick={() => onNavigate("agenda")}
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  Abrir agenda <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {data.upcoming.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma reserva futura confirmada ou pendente.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.upcoming.map((row, index) => {
                    const unit = SITE.units.find((item) => item.id === row.unit_id);
                    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    }).format(new Date(`${row.booking_date}T12:00:00Z`));
                    return (
                      <li
                        key={`${row.booking_date}-${row.start_time}-${row.unit_id}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="font-semibold">
                            {row.customer_name.split(" ")[0]} · {row.space_name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {unit?.name ?? "Arena Leste"} · {dateLabel}
                          </p>
                        </div>
                        <time className="font-mono text-sm font-bold tabular-nums">
                          {row.start_time.slice(0, 5)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h3 className="border-b border-border pb-3 font-display text-2xl font-bold uppercase">
                Acesso rápido
              </h3>
              <div className="mt-3 divide-y divide-border">
                {ADMIN_MODULES.filter((item) =>
                  ["agenda", "courts", "tournament", "backup"].includes(item.id),
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left font-semibold hover:text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
