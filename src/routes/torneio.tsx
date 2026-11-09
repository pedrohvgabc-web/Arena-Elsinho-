import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Loader2, Plus, ShieldCheck, Trophy, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LazyLoopVideo } from "@/components/LazyLoopVideo";
import { TournamentCountdown } from "@/components/TournamentCountdown";
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
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".vTorneio [data-r]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main id="conteudo" className="vTorneio">
      <nav aria-label="Navegação da Arena">
        <div className="wrap">
          <Link className="logo" to="/" aria-label="Arena Leste — início">
            <img
              src="/images/arena-leste-zip-logo.png"
              alt="Arena Leste Multi Sports"
              width="159"
              height="119"
            />
          </Link>
          <a className="l" href="/#unidades">
            Unidades
          </a>
          <a className="l on" href="#premiacao">
            Premiação
          </a>
          <a className="l" href="#inscricao">
            Inscrição
          </a>
          <Link className="btn pri" to="/" hash="topo">
            ← Início
          </Link>
        </div>
      </nav>

      <section className="hero torneo-hero" id="topo">
        <LazyLoopVideo
          src="/videos/campeonato-camera-lenta.mp4"
          poster="/images/campeonato-zip-poster.jpg"
          className="bgv"
        />
        <div className="shade" />
        <div className="wrap">
          <p className="mono">Arena Leste Multi Sports · Saúde · Esporte</p>
          <h1 className="big">
            <span>
              <em>Novembro</em>
            </span>
            <span>
              <em>Azul</em>
            </span>
          </h1>
          <p className="lead">
            Quarteto masculino na areia. Um encontro de esporte e conscientização sobre a saúde do
            homem.
          </p>
          <div className="cta">
            <a className="btn pri lg" href="#inscricao">
              Inscreva seu time <ArrowRight size={17} />
            </a>
            <a className="btn lg" href={SITE.instagram} target="_blank" rel="noopener noreferrer">
              Instagram da Arena
            </a>
          </div>
          <div className="tor-countdown">
            <p className="mono">Faltam para a primeira bola · 28/11/2026 · 15h</p>
            <TournamentCountdown />
          </div>
        </div>
      </section>

      <section id="premiacao" className="sec">
        <div className="wrap">
          <div className="tor-info-layout">
            <div>
              <div className="sh" data-r>
                <span className="mono">01 — Informações</span>
                <h2>
                  Seu quarteto.
                  <br />
                  Sua chance.
                </h2>
                <p>Saúde, esporte e conscientização sobre a saúde do homem. Vem participar!</p>
              </div>
              <div className="facts" data-r>
                <div>
                  <span className="mono">Categoria</span>
                  <b>{TOURNAMENT.category}</b>
                </div>
                <div>
                  <span className="mono">Data e hora</span>
                  <b>
                    {TOURNAMENT.dateShort} · {TOURNAMENT.time}
                  </b>
                </div>
                <div>
                  <span className="mono">Inscrição</span>
                  <b>{TOURNAMENT.entryFee}</b>
                </div>
                <div>
                  <span className="mono">Local</span>
                  <b>{TOURNAMENT.location}</b>
                </div>
              </div>
              <p className="tor-note mono">
                Pré-inscrição gratuita neste site. A organização confirma a participação e o
                pagamento com o capitão.
              </p>
            </div>
            <div>
              <div className="sh" data-r>
                <span className="mono">02 — Premiação</span>
                <h2>Jogue pela vitória.</h2>
              </div>
              <div className="prizes" data-r>
                {TOURNAMENT.prizes.map((prize, index) => (
                  <article className={`prize ${index === 0 ? "featured" : ""}`} key={prize.place}>
                    <Trophy aria-hidden="true" />
                    <span className="mono">{prize.place}</span>
                    <strong>{prize.amount}</strong>
                    <p>{prize.extra}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="inscricao" className="sec">
        <div className="wrap registration-grid">
          <div>
            <div className="sh">
              <span className="mono">03 — Pré-inscrição</span>
              <h2>
                Monte o time.
                <br />
                Vem pra areia.
              </h2>
              <p>Informe o capitão e os demais atletas do quarteto.</p>
            </div>
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
    </main>
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
