import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Instagram, MapPin, Trophy } from "lucide-react";
import { useState } from "react";
import { UnitMap } from "@/components/UnitMap";
import { SITE, TOURNAMENT } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arena Leste Multi Sports — Vôlei de praia em Porto Velho" },
      {
        name: "description",
        content:
          "Escolha uma das duas unidades, consulte quadras e horários e agende online na Arena Leste Multi Sports em Porto Velho/RO.",
      },
      { property: "og:title", content: "Arena Leste Multi Sports — Bora pra areia?" },
      {
        property: "og:description",
        content:
          "Duas unidades e oito quadras de areia em Porto Velho. Escolha onde jogar e faça seu agendamento online.",
      },
      { property: "og:image", content: SITE.socialImage },
      { property: "og:image:alt", content: "Ilustração de vôlei de praia para a Arena Leste" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE.socialImage },
    ],
  }),
  component: Home,
});

function VolleyballButton() {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      className="hero-ball-button"
      data-spinning={spinning}
      onClick={() => setSpinning((value) => !value)}
      aria-label={spinning ? "Parar o giro da bola de vôlei" : "Fazer a bola de vôlei girar"}
      aria-pressed={spinning}
      title="Clique para girar a bola"
    >
      <svg
        viewBox="0 0 320 320"
        className="hero-volleyball"
        role="img"
        aria-label="Bola de vôlei laranja e branca"
      >
        <circle cx="160" cy="160" r="145" fill="#f6f2e8" />
        <g fill="none" stroke="#e65a16" strokeWidth="13" strokeLinecap="round">
          <path d="M160 17c-77 28-111 86-99 151 10 55 49 103 99 135" />
          <path d="M160 17c77 28 111 86 99 151-10 55-49 103-99 135" />
          <path d="M25 112c45-30 90-39 136-26 51 14 91 46 125 96" />
          <path d="M31 213c46-25 94-30 140-16 41 12 77 37 107 74" />
        </g>
        <circle cx="160" cy="160" r="145" fill="none" stroke="#fff8e8" strokeWidth="4" />
      </svg>
      <span className="hero-ball-caption">Toque para girar</span>
    </button>
  );
}

function SportTicker() {
  const words = ["Areia", "Vôlei", "Esporte", "Encontro", "Porto Velho"];
  return (
    <div
      className="sport-ticker overflow-hidden border-y border-border/70"
      aria-label="Esporte, areia e convivência"
    >
      <div className="sport-ticker-track" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div className="flex shrink-0 items-center" key={copy}>
            {words.map((word, index) => (
              <span
                className="flex items-center font-display text-xl font-bold uppercase tracking-[0.12em] sm:text-2xl"
                key={`${copy}-${word}`}
              >
                <span className="px-5 sm:px-8">{word}</span>
                <span className="text-primary" aria-hidden="true">
                  ✳
                </span>
                {index === words.length - 1 && <span className="sr-only">.</span>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Home() {
  return (
    <>
      <section className="home-hero relative isolate overflow-hidden">
        <div
          className="hero-court-lines pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        />
        <div className="hero-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto grid min-h-[min(760px,82svh)] max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary sm:text-sm">
              <MapPin className="h-4 w-4" /> Porto Velho, Rondônia
            </p>
            <h1 className="mt-7 max-w-3xl font-display text-6xl font-extrabold uppercase leading-[0.82] tracking-tight sm:text-8xl lg:text-[7.4rem]">
              O jogo
              <br />
              começa na
              <br />
              <span className="text-primary">areia.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Reúna seu time, escolha sua unidade e venha viver o esporte do seu jeito. A Arena
              Leste é o ponto de encontro para quem ama jogar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/reservar"
                className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-glow"
              >
                Escolher unidade <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/torneio"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card/70 px-6 font-semibold backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
              >
                Novembro Azul <Trophy className="h-4 w-4" />
              </Link>
            </div>
            <a
              href="#unidades"
              className="mt-10 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Conheça as unidades <ArrowDown className="h-4 w-4" />
            </a>
          </div>
          <div className="hero-ball-stage relative mx-auto grid min-h-[300px] w-full max-w-[520px] place-items-center sm:min-h-[440px]">
            <div
              className="hero-photo-frame absolute inset-3 overflow-hidden rounded-[2rem] border border-white/15 sm:inset-0"
              aria-label="Imagem ilustrativa de uma partida de vôlei de praia ao entardecer"
            >
              <img
                src="/images/arena-leste-beach-hero.webp"
                alt="Imagem ilustrativa de uma partida de vôlei de praia ao entardecer"
                width={1920}
                height={1080}
                fetchPriority="high"
                decoding="async"
                className="hero-img h-full w-full object-cover"
              />
              <div className="hero-photo-shade absolute inset-0" aria-hidden="true" />
              <span className="hero-photo-label absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
                Imagem ilustrativa
              </span>
            </div>
            <div className="hero-ball-orbit hero-ball-orbit-one" aria-hidden="true" />
            <div className="hero-ball-orbit hero-ball-orbit-two" aria-hidden="true" />
            <VolleyballButton />
            <span className="hero-corner-label" aria-hidden="true">
              ARENA LESTE
              <br />
              MULTI SPORTS
            </span>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2 px-4 pb-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:px-6">
          <span>Vôlei de praia</span>
          <span>•</span>
          <span>Duas unidades</span>
          <span>•</span>
          <span>Agendamento direto</span>
        </div>
      </section>

      <SportTicker />

      <section id="torneio" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/torneio"
            aria-label="Abrir o Torneio Novembro Azul e inscrever uma equipe"
            className="group block overflow-hidden rounded-[2rem] border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src="/images/torneio-novembro-azul.webp"
              alt="Arte promocional do Torneio Novembro Azul: quarteto masculino de vôlei de praia, 28 de novembro às 15h, inscrições por equipe e premiação"
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
            />
          </Link>
          <div className="mt-8 flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Jogue por uma causa
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.9] sm:text-5xl">
                {TOURNAMENT.name}
              </h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                {TOURNAMENT.category} · 28 NOV, 15H · R$ 150 por equipe · Premiação de R$ 800, R$
                400 e R$ 200, com troféus e medalhas. Saúde, esporte e conscientização sobre a saúde
                do homem.
              </p>
            </div>
            <Link
              to="/torneio"
              className="btn-jelly inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-glow"
            >
              Inscreva seu quarteto <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="unidades"
        className="scroll-mt-24 border-y border-border bg-card/35 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Escolha seu ponto de encontro
              </p>
              <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
                Duas unidades.
                <br />
                Uma só paixão.
              </h2>
            </div>
            <p className="max-w-md text-muted-foreground">
              Selecione a unidade para ver o endereço no mapa e abrir a rota. O agendamento é feito
              nesta página; o WhatsApp fica como canal opcional de atendimento.
            </p>
          </div>
          <UnitMap />
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong className="text-foreground">Prefere confirmar antes de sair?</strong> Chame a
              Arena pelo WhatsApp: {SITE.phoneDisplay}.
            </p>
            <Link
              to="/reservar"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground"
            >
              Agendar uma unidade <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Acompanhe a Arena
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            A próxima jogada
            <br />
            pode ser sua.
          </h2>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Confira novidades, modalidades e informações oficiais nos canais da Arena Leste.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={SITE.reelTour}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-6 font-bold hover:border-primary hover:text-primary"
          >
            <ArrowRight className="h-4 w-4" /> Ver a estrutura
          </a>
          <a
            href={SITE.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-6 font-bold hover:border-primary hover:text-primary"
          >
            <Instagram className="h-4 w-4" /> Instagram
          </a>
          <a
            href={SITE.beacons}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"
          >
            <MapPin className="h-4 w-4" /> Links oficiais
          </a>
        </div>
      </section>
    </>
  );
}
