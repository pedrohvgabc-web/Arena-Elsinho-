import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Loader2, MessageCircle, Trophy } from "lucide-react";
import {
  adminSetTournamentRegistrationStatus,
  adminTournamentRegistrations,
} from "@/lib/arena.functions";
import { maskPhone } from "@/lib/arena-rules";
import type { TournamentRegistrationStatus } from "@/lib/tournament-schema";

const STATUS: Record<TournamentRegistrationStatus, { label: string; style: string }> = {
  pending: { label: "Pendente", style: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmada", style: "bg-success/15 text-success" },
  cancelled: { label: "Cancelada", style: "bg-muted text-muted-foreground" },
};

export function TournamentRegistrationsAdmin() {
  const queryClient = useQueryClient();
  const fetchRows = useServerFn(adminTournamentRegistrations);
  const setStatus = useServerFn(adminSetTournamentRegistrationStatus);
  const [revealed, setRevealed] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["tournament-registrations"],
    queryFn: () => fetchRows(),
    retry: false,
    refetchInterval: 30_000,
  });
  const rows = q.data ?? [];
  const pending = rows.filter((row) => row.status === "pending").length;

  async function update(id: string, status: TournamentRegistrationStatus) {
    if (status === "cancelled" && !confirm("Cancelar esta pré-inscrição?")) return;
    try {
      const result = await setStatus({ data: { id, status } });
      if (result.ok) {
        toast.success("Status da inscrição atualizado.");
        await queryClient.invalidateQueries({ queryKey: ["tournament-registrations"] });
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Não foi possível atualizar agora.");
    }
  }

  return (
    <section
      className="mt-8 rounded-3xl border border-primary/35 bg-card p-5 sm:p-7"
      aria-labelledby="tournament-admin-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Trophy className="h-4 w-4" /> Torneio Novembro Azul
          </p>
          <h2
            id="tournament-admin-heading"
            className="mt-2 font-display text-3xl font-extrabold uppercase"
          >
            Pré-inscrições
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados visíveis somente nesta área autenticada. Exibindo até 300 inscrições mais
            recentes.
          </p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Pendentes: </span>
          <strong className="text-warning">{pending}</strong>
        </div>
      </div>

      {q.isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando inscrições…
        </p>
      ) : q.isError ? (
        <p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar as inscrições. Verifique se a migração do banco foi aplicada.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma pré-inscrição recebida ainda.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => {
            const status = STATUS[row.status];
            const phoneIsVisible = revealed === row.id;
            const date = new Date(row.created_at).toLocaleString("pt-BR", {
              timeZone: "America/Porto_Velho",
              dateStyle: "short",
              timeStyle: "short",
            });
            const roster = [row.captain_name, ...row.athletes];
            const contactMessage = `Olá, ${row.captain_name.split(" ")[0]}! Sobre a pré-inscrição ${row.registration_code} da equipe ${row.team_name || "sem nome"} no Torneio Novembro Azul da Arena Leste.`;
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold uppercase">
                      {row.team_name || "Equipe sem nome"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Código {row.registration_code} · Recebida {date}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      Pagamento:{" "}
                      {row.payment_provider === "infinitepay"
                        ? row.payment_status === "paid"
                          ? `Pago via ${row.payment_capture_method === "credit_card" ? "cartão" : "Pix"}`
                          : row.payment_status === "expired"
                            ? "Link expirado"
                            : row.payment_status === "refunded"
                              ? "Estornado"
                              : "Aguardando InfinitePay"
                        : "Pix demonstrativo · sem cobrança real"}
                    </p>
                    {row.status === "cancelled" &&
                      row.payment_provider === "infinitepay" &&
                      row.payment_status === "paid" && (
                        <p
                          role="alert"
                          className="mt-2 max-w-xl rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning"
                        >
                          Pagamento recebido, mas a inscrição continua cancelada. Contate o capitão
                          e, se necessário, faça o estorno manualmente na InfinitePay.
                        </p>
                      )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.style}`}>
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="text-sm">
                      <strong>Capitão:</strong> {row.captain_name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span>
                        <strong>WhatsApp:</strong>{" "}
                        {phoneIsVisible ? row.captain_phone : maskPhone(row.captain_phone)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRevealed(phoneIsVisible ? null : row.id)}
                        aria-label={phoneIsVisible ? "Ocultar WhatsApp" : "Mostrar WhatsApp"}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
                      >
                        {phoneIsVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <a
                        href={`https://wa.me/55${row.captain_phone}?text=${encodeURIComponent(contactMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:border-primary hover:text-primary"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Contatar capitão
                      </a>
                    </div>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Elenco · {roster.length} atleta{roster.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {roster.map((name, index) => (
                        <li
                          key={`${row.id}-${index}`}
                          className="rounded-full border border-border px-3 py-1 text-xs"
                        >
                          {index === 0 ? "Capitão · " : ""}
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Atualizar situação
                    <select
                      value={row.status}
                      onChange={(event) =>
                        void update(row.id, event.target.value as TournamentRegistrationStatus)
                      }
                      className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground md:min-w-44"
                    >
                      <option value="pending">Pendente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />O pagamento real só muda após
        validação no servidor com a InfinitePay. O status da inscrição e o status do pagamento ficam
        separados; cancelar a inscrição não desativa automaticamente um link já criado nem estorna
        uma cobrança. Se o pagamento entrar depois, a equipe permanece cancelada e o admin verá um
        alerta para atendimento/estorno manual.
      </p>
    </section>
  );
}
