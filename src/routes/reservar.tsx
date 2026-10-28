import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Check, Users, Loader2, Copy, MessageCircle, CalendarPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { getSpaces, getAvailability, createBooking } from "@/lib/arena.functions";
import { SPACE_IMAGES } from "@/lib/space-images";
import { arenaNow, formatBRL, PAYMENT_LABEL, type PaymentMethod } from "@/lib/arena-rules";
import { waLink } from "@/lib/site";
import { Magnetic } from "@/components/motion";

export const Route = createFileRoute("/reservar")({
  validateSearch: z.object({ espaco: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Reservar horário — Arena Elsinho" },
      { name: "description", content: "Escolha o espaço, a data e o horário e reserve online na Arena Elsinho." },
      { property: "og:title", content: "Reservar horário — Arena Elsinho" },
      { property: "og:description", content: "Reserva online em três passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getSpaces(),
  component: Reservar,
});

const STATUS_STYLE = {
  available: "border-border bg-card hover:border-primary",
  pending: "border-warning/40 bg-warning/10 text-warning cursor-not-allowed",
  confirmed: "border-border bg-muted text-muted-foreground cursor-not-allowed line-through",
  unavailable: "border-border/50 bg-muted/40 text-muted-foreground/60 cursor-not-allowed",
} as const;
const STATUS_TEXT = { available: "Disponível", pending: "Pendente", confirmed: "Reservado", unavailable: "Indisponível" } as const;

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

type Done = Extract<Awaited<ReturnType<typeof createBooking>>, { ok: true }>["booking"];

function Reservar() {
  const spaces = Route.useLoaderData();
  const { espaco } = Route.useSearch();
  const [step, setStep] = useState(espaco ? 2 : 1);
  const [spaceId, setSpaceId] = useState(espaco && spaces.some((s) => s.id === espaco) ? espaco : "");
  const [date, setDate] = useState<Date | undefined>();
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [idem] = useState(() => crypto.randomUUID());

  const space = spaces.find((s) => s.id === spaceId);
  const dateISO = date ? toISO(date) : "";
  const fetchAvail = useServerFn(getAvailability);
  const submit = useServerFn(createBooking);
  const avail = useQuery({
    queryKey: ["avail", spaceId, dateISO],
    queryFn: () => fetchAvail({ data: { spaceId, date: dateISO } }),
    enabled: !!spaceId && !!dateISO,
  });
  const today = useMemo(() => new Date(`${arenaNow().date}T00:00:00`), []);

  async function confirm() {
    setError(null);
    if (name.trim().split(/\s+/).length < 2) return setError("Informe nome e sobrenome.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Informe um WhatsApp com DDD.");
    setSubmitting(true);
    try {
      const r = await submit({ data: { spaceId, date: dateISO, start, name, phone, method, idempotencyKey: idem } });
      if (r.ok) setDone(r.booking);
      else { setError(r.error); avail.refetch(); }
    } catch { setError("Falha de conexão. Tente novamente."); }
    finally { setSubmitting(false); }
  }

  if (done) return <Confirmation b={done} />;

  const steps = ["Espaço", "Data e horário", "Seus dados"];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-5xl font-bold uppercase">Reservar horário</h1>
      <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Etapas">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={`rounded-xl border p-3 text-sm ${step === i + 1 ? "border-primary bg-primary/10" : step > i + 1 ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
            <span className="block font-display text-lg font-bold sm:inline">{i + 1}</span> <span className="text-xs sm:text-sm">{s}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="animate-pop mt-10" aria-labelledby="s1">
          <h2 id="s1" className="text-3xl font-bold uppercase">Escolha o espaço</h2>
          <div role="radiogroup" className="mt-6 grid gap-4 md:grid-cols-3">
            {spaces.map((s) => {
              const sel = s.id === spaceId;
              return (
                <button key={s.id} role="radio" aria-checked={sel} disabled={!s.active} onClick={() => { setSpaceId(s.id); setStart(""); }}
                  className={`relative overflow-hidden rounded-2xl border-2 text-left transition-colors disabled:opacity-50 ${sel ? "border-primary" : "border-border hover:border-primary/50"}`}>
                  <img src={SPACE_IMAGES[s.id]} alt={s.name} loading="lazy" decoding="async" width={1366} height={768} className="aspect-video w-full object-cover" />
                  {sel && <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-5 w-5" /></span>}
                  <div className="p-4">
                    <p className="font-display text-xl font-bold uppercase">{s.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-4 w-4" />Até {s.capacity} · {formatBRL(s.price_cents)}/h</p>
                    {!s.active && <p className="mt-1 text-sm text-destructive">Indisponível</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <button disabled={!spaceId} onClick={() => setStep(2)} className="min-h-12 rounded-full bg-primary px-8 font-bold text-primary-foreground disabled:opacity-40">Continuar</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-pop mt-10" aria-labelledby="s2">
          <h2 id="s2" className="text-3xl font-bold uppercase">Data e horário <span className="text-lg text-muted-foreground normal-case">— {space?.name}</span></h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-border bg-card p-3">
              <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setStart(""); }}
                disabled={[{ before: today }, { dayOfWeek: [0] }]} />
            </div>
            <div>
              {!dateISO && <p className="text-muted-foreground">Selecione uma data no calendário. Domingos fechados.</p>}
              {avail.isFetching && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando horários…</p>}
              {avail.isError && <p className="text-destructive">Não foi possível carregar os horários.</p>}
              {avail.data && !avail.isFetching && (
                <>
                  <p className="mb-4 capitalize text-muted-foreground">{fmtDate(dateISO)}</p>
                  <div role="radiogroup" aria-label="Horários" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {avail.data.map((s) => {
                      const sel = s.start === start;
                      const ok = s.status === "available";
                      return (
                        <button key={s.start} role="radio" aria-checked={sel} disabled={!ok} onClick={() => setStart(s.start)}
                          aria-label={`${s.start} às ${s.end}, ${STATUS_TEXT[s.status]}`}
                          className={`min-h-14 rounded-xl border-2 px-2 py-2 text-center transition-colors ${ok && !sel ? "btn-jelly" : ""} ${sel ? "border-primary bg-primary text-primary-foreground" : STATUS_STYLE[s.status]}`}>
                          <span className="block font-semibold">{s.start}</span>
                          <span className="block text-[11px] opacity-80">{sel ? "Selecionado" : STATUS_TEXT[s.status]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {avail.data.length === 0 && <p className="text-muted-foreground">Sem horários nesta data.</p>}
                </>
              )}
            </div>
          </div>
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(1)} className="min-h-12 rounded-full border border-border px-6">Voltar</button>
            <button disabled={!start} onClick={() => setStep(3)} className="min-h-12 rounded-full bg-primary px-8 font-bold text-primary-foreground disabled:opacity-40">Continuar</button>
          </div>
        </section>
      )}

      {step === 3 && space && (
        <section className="animate-pop mt-10 grid gap-8 lg:grid-cols-[1fr_380px]" aria-labelledby="s3">
          <div>
            <h2 id="s3" className="text-3xl font-bold uppercase">Seus dados</h2>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Nome completo</label>
                <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4" aria-describedby={error ? "form-error" : undefined} />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">WhatsApp (com DDD)</label>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(65) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4" aria-describedby={error ? "form-error" : undefined} />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                    <label key={m} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 ${method === m ? "border-primary bg-primary/10" : "border-border"}`}>
                      <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-[var(--color-primary)]" />
                      <span className="text-sm font-medium">{PAYMENT_LABEL[m]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && <p id="form-error" role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />{error}</p>}
            </div>
            <button onClick={() => setStep(2)} className="mt-8 min-h-12 rounded-full border border-border px-6">Voltar</button>
          </div>
          <aside className="h-fit rounded-2xl border border-border bg-card p-6" aria-label="Resumo">
            <h3 className="text-2xl font-bold uppercase">Resumo</h3>
            <dl className="mt-4 space-y-2 text-sm">
              {[["Espaço", space.name], ["Data", fmtDate(dateISO)], ["Horário", start], ["Cliente", name || "—"], ["Telefone", phone || "—"], ["Pagamento", PAYMENT_LABEL[method]]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right capitalize">{v}</dd></div>
              ))}
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Valor</dt><dd>{formatBRL(space.price_cents)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">Ao confirmar, você aceita a <Link to="/cancelamento" className="underline">política de cancelamento</Link> e a <Link to="/privacidade" className="underline">política de privacidade</Link>.</p>
            <Magnetic strength={0.15} className="mt-6 block w-full">
              <button onClick={confirm} disabled={submitting} className="btn-jelly flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-glow disabled:opacity-60">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar reserva
              </button>
            </Magnetic>
          </aside>
        </section>
      )}
    </div>
  );
}

function Confirmation({ b }: { b: Done }) {
  const msg = `Olá! Minha reserva na Arena Elsinho: ${b.code} — ${b.space}, ${fmtDate(b.date)} às ${b.start}. Pagamento: ${PAYMENT_LABEL[b.method as PaymentMethod]}.`;
  const ics = () => {
    const d = b.date.replace(/-/g, "");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `UID:${b.code}@arenaelsinho`, `DTSTART:${d}T${b.start.replace(":", "")}00`, `DTEND:${d}T${b.end.replace(":", "")}00`, `SUMMARY:Arena Elsinho — ${b.space}`, `DESCRIPTION:Reserva ${b.code}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = `reserva-${b.code}.ics`;
    a.click();
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <span className="animate-pop-bounce mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/20 text-success"><Check className="h-8 w-8" /></span>
      <h1 className="mt-6 text-5xl font-bold uppercase">Reserva registrada!</h1>
      <p className="mt-2 text-muted-foreground">Obrigado, {b.firstName}. Guarde seu código:</p>
      <p className="mt-4 font-display text-4xl font-bold tracking-widest text-primary">{b.code}</p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-left">
        <p><strong>{b.space}</strong></p>
        <p className="capitalize text-muted-foreground">{fmtDate(b.date)} · {b.start}–{b.end}</p>
        <p className="mt-2">Valor: <strong>{formatBRL(b.amount)}</strong> · Status: <span className="text-warning">pagamento pendente</span></p>
        {b.method === "pix" ? (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {b.pixSimulated ? (
              <p><strong>Pix em modo demonstrativo.</strong> A cobrança Pix online ainda não está ativa. Combine o pagamento com a arena pelo WhatsApp. Sua reserva fica pendente até a confirmação.</p>
            ) : (
              <div className="text-center">
                <p>Escaneie o QR Code ou copie o código Pix e pague até {b.expiresAt ? new Date(b.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "30 min"}. A confirmação é automática.</p>
                <PixQr payload={b.pixPayload ?? ""} />
                <p className="mt-2 break-all rounded-lg bg-background p-2 text-left font-mono text-xs">{b.pixPayload}</p>
                <button onClick={() => { navigator.clipboard.writeText(b.pixPayload ?? ""); toast.success("Código copiado"); }} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"><Copy className="h-4 w-4" />Copiar código Pix</button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Pagamento no local ({PAYMENT_LABEL[b.method as PaymentMethod].toLowerCase()}). Chegue com alguns minutos de antecedência.</p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"><MessageCircle className="h-4 w-4" />Enviar pelo WhatsApp</a>
        <button onClick={ics} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-6"><CalendarPlus className="h-4 w-4" />Adicionar ao calendário</button>
      </div>
    </div>
  );
}

function PixQr({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode").then((m) => m.toDataURL(payload, { width: 240, margin: 1 })).then((u) => { if (alive) setSrc(u); }).catch(() => {});
    return () => { alive = false; };
  }, [payload]);
  return src ? <img src={src} alt="QR Code Pix" width={240} height={240} className="mx-auto mt-3 rounded-xl bg-background p-2" /> : <div className="mx-auto mt-3 grid h-60 w-60 place-items-center"><Loader2 className="animate-spin" /></div>;
}
