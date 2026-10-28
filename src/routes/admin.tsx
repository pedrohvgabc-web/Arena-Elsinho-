import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, LogOut, Copy, Check, X, StickyNote, MessageCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { adminCheck, adminLogin, adminLogout, adminDay, adminUpdateBooking, adminPending } from "@/lib/arena.functions";
import { arenaNow, formatBRL, maskPhone, PAYMENT_LABEL, STATUS_LABEL, type PaymentMethod, type PaymentStatus } from "@/lib/arena-rules";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel — Arena Elsinho" },
      { name: "description", content: "Painel administrativo da Arena Elsinho." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel — Arena Elsinho" },
      { property: "og:description", content: "Área restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const check = useServerFn(adminCheck);
  const q = useQuery({ queryKey: ["admin-auth"], queryFn: () => check() });
  if (q.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin" /></div>;
  return q.data?.authed ? <Dashboard /> : <Login />;
}

function Login() {
  const login = useServerFn(adminLogin);
  const qc = useQueryClient();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <form className="w-full max-w-sm rounded-2xl border border-border bg-card p-8" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        const r = await login({ data: { password: pw } }).catch(() => ({ ok: false, error: "Falha de conexão." }));
        setBusy(false);
        if (r.ok) qc.invalidateQueries({ queryKey: ["admin-auth"] }); else setErr(r.error);
      }}>
        <h1 className="text-3xl font-bold uppercase">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à administração.</p>
        <label htmlFor="pw" className="mt-6 block text-sm font-medium">Senha</label>
        <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4" aria-describedby={err ? "pw-err" : undefined} />
        {err && <p id="pw-err" role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        <button disabled={busy || !pw} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Entrar</button>
      </form>
    </div>
  );
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid: "bg-success/15 text-success", pending: "bg-warning/15 text-warning", cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground", failed: "bg-destructive/15 text-destructive",
};
const shift = (iso: string, d: number) => { const x = new Date(`${iso}T12:00:00`); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

function Dashboard() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => arenaNow().date);
  const [search, setSearch] = useState("");
  const [space, setSpace] = useState("all");
  const [status, setStatus] = useState("all");
  const [reveal, setReveal] = useState<string | null>(null);
  const fetchDay = useServerFn(adminDay);
  const update = useServerFn(adminUpdateBooking);
  const logout = useServerFn(adminLogout);
  const day = useQuery({ queryKey: ["admin-day", date], queryFn: () => fetchDay({ data: { date } }), retry: false });

  const rows = useMemo(() => (day.data?.bookings ?? []).filter((b) =>
    (space === "all" || b.space_id === space) && (status === "all" || b.payment_status === status) &&
    (!search || b.customer_name.toLowerCase().includes(search.toLowerCase()) || b.booking_code.includes(search.toUpperCase()))), [day.data, search, space, status]);

  const all = day.data?.bookings ?? [];
  const active = all.filter((b) => b.payment_status === "pending" || b.payment_status === "paid");
  const revenue = all.filter((b) => b.payment_status === "paid").reduce((s, b) => s + b.amount_cents, 0);
  const pending = all.filter((b) => b.payment_status === "pending").length;
  const capacity = (day.data?.slotsPerSpace ?? 0) * (day.data?.spaces.length ?? 0);
  const occupancy = capacity ? Math.round((active.length / capacity) * 100) : 0;
  const now = arenaNow();
  const next = active.find((b) => date > now.date || (date === now.date && b.start_time.slice(0, 5) >= `${String(Math.floor(now.minutes / 60)).padStart(2, "0")}:00`));
  const spaceName = (id: string) => day.data?.spaces.find((s) => s.id === id)?.name ?? id;

  async function act(id: string, action: "mark_paid" | "cancel" | "note", note?: string) {
    if (action === "cancel" && !confirm("Cancelar esta reserva?")) return;
    if (action === "mark_paid" && !confirm("Confirmar esta reserva como paga?")) return;
    const r = await update({ data: { id, action, note } });
    if (r.ok) { toast.success(action === "mark_paid" ? "Reserva confirmada" : "Atualizado"); qc.invalidateQueries({ queryKey: ["admin-day"] }); qc.invalidateQueries({ queryKey: ["admin-pending"] }); } else toast.error(r.error);
  }
  if (day.error) { qc.invalidateQueries({ queryKey: ["admin-auth"] }); }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold uppercase">Painel da arena</h1>
        <button onClick={async () => { await logout(); qc.invalidateQueries({ queryKey: ["admin-auth"] }); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm"><LogOut className="h-4 w-4" />Sair</button>
      </div>

      <PendingList onConfirm={(id) => act(id, "mark_paid")} onCancel={(id) => act(id, "cancel")} onOpen={setDate} />

      <div className="mt-8 flex items-center gap-2">
        <button aria-label="Dia anterior" onClick={() => setDate(shift(date, -1))} className="grid h-11 w-11 place-items-center rounded-lg border border-border"><ChevronLeft /></button>
        <input type="date" aria-label="Data" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3" />
        <button aria-label="Próximo dia" onClick={() => setDate(shift(date, 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-border"><ChevronRight /></button>
        <button onClick={() => setDate(arenaNow().date)} className="h-11 rounded-lg border border-border px-4 text-sm">Hoje</button>
      </div>


      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["Receita confirmada", formatBRL(revenue)], ["Reservas do dia", String(active.length)], ["Pagamentos pendentes", String(pending)], ["Ocupação", `${occupancy}%`], ["Próximo horário", next ? `${next.start_time.slice(0, 5)} · ${next.customer_name.split(" ")[0]}` : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-1 font-display text-2xl font-bold">{v}</p></div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <input placeholder="Buscar cliente ou código" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 min-w-56 flex-1 rounded-lg border border-input bg-card px-3" />
        <select aria-label="Espaço" value={space} onChange={(e) => setSpace(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3">
          <option value="all">Todos os espaços</option>
          {day.data?.spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3">
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {day.isLoading ? <p className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</p>
        : rows.length === 0 ? <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhuma reserva para este filtro.</p>
        : (
          <div className="mt-6 space-y-3 lg:space-y-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border">
            <div className="hidden grid-cols-[90px_1.4fr_150px_1.3fr_130px_110px_auto] gap-3 bg-card px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground lg:grid">
              <span>Horário</span><span>Cliente</span><span>WhatsApp</span><span>Espaço</span><span>Pagamento</span><span>Status</span><span>Ações</span>
            </div>
            {rows.map((b) => {
              const st = b.payment_status as PaymentStatus;
              const shown = reveal === b.id;
              return (
                <div key={b.id} className="grid gap-2 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[90px_1.4fr_150px_1.3fr_130px_110px_auto] lg:items-center lg:gap-3 lg:rounded-none lg:border-0 lg:border-t lg:bg-transparent">
                  <span className="font-display text-xl font-bold">{b.start_time.slice(0, 5)}</span>
                  <div><p className="font-medium">{b.customer_name}</p><p className="text-xs text-muted-foreground">{b.booking_code}{b.notes ? ` · ${b.notes}` : ""}</p></div>
                  <span className="flex items-center gap-1 text-sm">
                    {shown ? b.phone : maskPhone(b.phone)}
                    <button aria-label={shown ? "Ocultar telefone" : "Mostrar telefone"} onClick={() => setReveal(shown ? null : b.id)} className="p-1">{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </span>
                  <span className="text-sm">{spaceName(b.space_id)}</span>
                  <span className="text-sm">{PAYMENT_LABEL[b.payment_method as PaymentMethod]}</span>
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[st]}`}>{STATUS_LABEL[st]}</span>
                  <div className="flex flex-wrap gap-1">
                    {st === "pending" && <IconBtn label="Confirmar reserva" onClick={() => act(b.id, "mark_paid")}><Check className="h-4 w-4 text-success" /></IconBtn>}
                    <IconBtn label="Copiar WhatsApp" onClick={() => { navigator.clipboard.writeText(b.phone); toast.success("Copiado"); }}><Copy className="h-4 w-4" /></IconBtn>
                    <a aria-label="Enviar confirmação" title="Enviar confirmação" target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent"
                      href={`https://wa.me/55${b.phone}?text=${encodeURIComponent(`Olá, ${b.customer_name.split(" ")[0]}! Confirmando sua reserva ${b.booking_code} na Arena Elsinho: ${spaceName(b.space_id)}, ${b.booking_date.split("-").reverse().join("/")} às ${b.start_time.slice(0, 5)}. Valor ${formatBRL(b.amount_cents)}.`)}`}><MessageCircle className="h-4 w-4" /></a>
                    <IconBtn label="Registrar observação" onClick={() => { const n = prompt("Observação", b.notes ?? ""); if (n !== null) act(b.id, "note", n); }}><StickyNote className="h-4 w-4" /></IconBtn>
                    {(st === "pending" || st === "paid") && <IconBtn label="Cancelar reserva" onClick={() => act(b.id, "cancel")}><X className="h-4 w-4 text-destructive" /></IconBtn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} title={label} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent">{children}</button>;
}

function PendingList({ onConfirm, onCancel, onOpen }: { onConfirm: (id: string) => void; onCancel: (id: string) => void; onOpen: (date: string) => void }) {
  const fetchPending = useServerFn(adminPending);
  const q = useQuery({ queryKey: ["admin-pending"], queryFn: () => fetchPending(), retry: false, refetchInterval: 30000 });
  const list = q.data ?? [];
  return (
    <section className="mt-6 rounded-2xl border border-warning/40 bg-warning/5 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold uppercase">Reservas pendentes <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-sm text-warning">{list.length}</span></h2>
      {q.isLoading ? <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</p>
        : list.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma reserva aguardando confirmação.</p>
        : (
          <ul className="mt-3 space-y-2">
            {list.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
                <button onClick={() => onOpen(b.booking_date)} className="min-w-0 flex-1 text-left">
                  <p className="font-medium">{b.booking_date.split("-").reverse().join("/")} · {b.start_time.slice(0, 5)} — {b.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{b.space_name} · {PAYMENT_LABEL[b.payment_method as PaymentMethod]} · {formatBRL(b.amount_cents)} · {b.booking_code}</p>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => onConfirm(b.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"><Check className="h-4 w-4" />Confirmar</button>
                  <IconBtn label="Cancelar reserva" onClick={() => onCancel(b.id)}><X className="h-4 w-4 text-destructive" /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
