import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { registerTournamentTeam } from "@/lib/arena.functions";
import { SITE, TOURNAMENT, waLink } from "@/lib/site";

export const Route = createFileRoute("/torneio")({
  head: () => ({
    meta: [
      { title: "Torneio Novembro Azul — Arena Leste Multi Sports" },
      {
        name: "description",
        content:
          "Inscreva seu quarteto masculino no Torneio Novembro Azul da Arena Leste, dia 28 de novembro às 15h.",
      },
      { property: "og:title", content: "Torneio Novembro Azul — Arena Leste" },
      {
        property: "og:description",
        content:
          "Quarteto masculino. 28/11/2026 às 15h. Inscrição de R$150 por equipe. Vem participar!",
      },
      { property: "og:image", content: SITE.socialImage },
      {
        property: "og:image:alt",
        content: "Ilustração de vôlei de praia para o Torneio Novembro Azul",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE.socialImage },
    ],
  }),
  component: TournamentPage,
});

function TournamentPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-[#101216] px-4 py-14 sm:px-6 sm:py-20">
        <div
          className="absolute inset-0 -z-10 opacity-35"
          style={{
            background:
              "radial-gradient(circle at 78% 42%, #d64c11 0, transparent 32%), linear-gradient(140deg, transparent 35%, #173d58 100%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <Link
              to="/"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para Arena Leste
            </Link>
            <p className="mt-10 inline-flex rounded-full bg-[#1877a7] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white">
              Saúde · esporte · conscientização
            </p>
            <h1 className="mt-5 font-display text-6xl font-extrabold uppercase leading-[0.82] text-white sm:text-8xl">
              Torneio
              <br />
              <span className="text-[#df4f07]">Novembro</span>
              <br />
              Azul
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Um dia de esporte e conscientização sobre a saúde do homem. Reúna sua equipe, dispute
              na areia e venha fazer parte.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#inscricao"
                className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-glow"
              >
                Quero inscrever meu time <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 font-semibold text-white hover:border-primary"
              >
                Instagram da Arena
              </a>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <img
              src="/images/torneio-novembro-azul.webp"
              alt="Arte promocional ilustrada do Torneio Novembro Azul da Arena Leste"
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
              className="aspect-video w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Informações do torneio
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.92] sm:text-5xl">
            Seu quarteto
            <br />
            na disputa.
          </h2>
          <div className="mt-6 space-y-3">
            <InfoRow label="Categoria" value={TOURNAMENT.category} />
            <InfoRow label="Data" value={TOURNAMENT.date} />
            <InfoRow label="Início" value={TOURNAMENT.time} />
            <InfoRow label="Local" value={TOURNAMENT.location} />
            <InfoRow label="Inscrição" value={TOURNAMENT.entryFee} />
          </div>
          <div className="mt-6 rounded-2xl border border-[#1877a7]/50 bg-[#1877a7]/10 p-5">
            <p className="font-bold text-foreground">
              Saúde, esporte e conscientização sobre a saúde do homem.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vem participar com sua equipe no Torneio Novembro Azul da Arena Leste.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Premiação</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase sm:text-5xl">
            Jogue pela vitória.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TOURNAMENT.prizes.map((prize, index) => (
              <article
                key={prize.place}
                className={`rounded-2xl border p-5 ${index === 0 ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
              >
                <Trophy
                  className={`h-5 w-5 ${index === 0 ? "text-primary" : "text-muted-foreground"}`}
                />
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {prize.place}
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">{prize.amount}</p>
                <p className="mt-1 text-sm text-muted-foreground">+ {prize.extra}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            O formulário registra uma pré-inscrição. A organização entrará em contato pelo WhatsApp
            para confirmar a participação e orientar sobre a inscrição. Nenhum pagamento é cobrado
            neste site.
          </p>
        </div>
      </section>

      <section
        id="inscricao"
        className="scroll-mt-20 border-y border-border bg-card/40 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Garanta sua vaga
            </p>
            <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.88] sm:text-6xl">
              Monte o time.
              <br />
              Vem pra areia.
            </h2>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                <strong className="text-foreground">Quarteto masculino:</strong> capitão e mais 3 a
                5 atletas. O limite é de 6 pessoas contando o capitão.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                Seus dados ficam protegidos e só a organização autenticada consegue consultar as
                inscrições. Usaremos nome e WhatsApp para organizar o torneio e falar com o capitão.
              </p>
            </div>
          </div>
          <RegistrationForm />
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="text-right text-sm sm:text-base">{value}</strong>
    </div>
  );
}

function RegistrationForm() {
  const submit = useServerFn(registerTournamentTeam);
  const [members, setMembers] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [submissionId] = useState(() => globalThis.crypto.randomUUID());

  function updateMember(index: number, value: string) {
    setMembers((current) =>
      current.map((member, position) => (position === index ? value : member)),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await submit({
        data: {
          captainName: String(form.get("captainName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          teamName: String(form.get("teamName") ?? ""),
          athletes: members,
          consent: form.get("consent") === "on",
          website: String(form.get("website") ?? ""),
          submissionId,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRegistrationCode(result.code);
    } catch {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
  }

  if (registrationCode !== null) {
    const message = `Olá! Fiz uma pré-inscrição para o ${TOURNAMENT.name}. Código ${registrationCode}. Gostaria de confirmar os próximos passos.`;
    return (
      <div className="rounded-3xl border border-success/40 bg-success/5 p-6 sm:p-8" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-display text-3xl font-extrabold uppercase">
          Pré-inscrição recebida!
        </h3>
        <p className="mt-2 text-muted-foreground">
          Anote seu código <strong className="text-foreground">{registrationCode}</strong>. A equipe
          vai confirmar a participação e orientar o pagamento pelo WhatsApp.
        </p>
        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-jelly mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"
        >
          <ArrowRight className="h-4 w-4" /> Continuar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-background p-5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          Nome do capitão
          <input
            name="captainName"
            required
            minLength={3}
            maxLength={80}
            autoComplete="name"
            className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 font-normal"
            placeholder="Nome e sobrenome"
          />
        </label>
        <label className="text-sm font-semibold">
          WhatsApp do capitão
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 font-normal"
            placeholder="(69) 99999-9999"
          />
        </label>
        <label className="text-sm font-semibold">
          Nome da equipe <span className="font-normal text-muted-foreground">(opcional)</span>
          <input
            name="teamName"
            maxLength={80}
            className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 font-normal"
            placeholder="Como vamos chamar o time?"
          />
        </label>
      </div>

      <fieldset className="mt-7">
        <legend className="font-display text-xl font-bold uppercase">
          Atletas além do capitão{" "}
          <span className="font-sans text-xs font-normal normal-case text-muted-foreground">
            (3 obrigatórios, até 5)
          </span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {members.map((member, index) => (
            <label className="text-sm font-semibold" key={index}>
              Integrante {index + 2}
              {index > 2 ? " (opcional)" : ""}
              <span className="relative mt-1.5 block">
                <input
                  value={member}
                  onChange={(event) => updateMember(index, event.target.value)}
                  required={index < 3}
                  minLength={3}
                  maxLength={80}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4 pr-12 font-normal"
                  placeholder="Nome e sobrenome"
                />
                {index > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((current) => current.filter((_, position) => position !== index))
                    }
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remover integrante ${index + 2}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </span>
            </label>
          ))}
        </div>
        {members.length < 5 && (
          <button
            type="button"
            onClick={() => setMembers((current) => [...current, ""])}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Adicionar atleta opcional
          </button>
        )}
      </fieldset>

      <label className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 accent-[var(--color-primary)]"
        />
        <span>
          Concordo que a Arena Leste use estes dados para organizar o torneio e entrar em contato
          com o capitão. Li a{" "}
          <Link to="/privacidade" className="font-semibold text-primary underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      <label
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        tabIndex={-1}
      >
        Deixe este campo vazio
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="btn-jelly mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-glow disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
        {busy ? "Enviando pré-inscrição…" : "Enviar pré-inscrição"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Inscrição: {TOURNAMENT.entryFee}. O envio não efetua pagamento nem confirma a vaga
        automaticamente.
      </p>
    </form>
  );
}
