import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Instagram, MapPin } from "lucide-react";
import { useState } from "react";
import { UnitMap } from "@/components/UnitMap";
import { LazyLoopVideo } from "@/components/LazyLoopVideo";
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
      {
        property: "og:image:alt",
        content: "Partida de vôlei de praia na Arena Leste em Porto Velho",
      },
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
            <h1 className="mt-7 max-w-3xl font-display text-6xl font-extrabold uppercase leading-[0.82] tracking-tight text-[#fff9f2] sm:text-8xl lg:text-[7.4rem]">
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
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                to="/reservar"
                search={{ unit: "unidade-1" }}
                className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-glow"
              >
                Agendar Unidade 1 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/reservar"
                search={{ unit: "unidade-2" }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-5 font-bold text-white transition-colors hover:border-primary hover:text-primary"
              >
                Agendar Unidade 2 <ArrowRight className="h-4 w-4" />
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
              aria-hidden="true"
            >
              <LazyLoopVideo
                src="/videos/arena-leste-hero.mp4"
                poster="/images/arena-leste-hero-poster.webp"
                className="hero-img h-full w-full object-cover"
              />
              <div className="hero-photo-shade absolute inset-0" aria-hidden="true" />
              <span className="hero-photo-label absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
                Arena Leste · Porto Velho
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

      <section id="torneio" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/torneio"
            aria-label="Abrir o Torneio Novembro Azul e inscrever uma equipe"
            className="group grid overflow-hidden rounded-[1.75rem] border border-campaign/30 bg-campaign text-campaign-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:grid-cols-[1.08fr_0.92fr]"
          >
            <img
              src="/images/torneio-novembro-azul.webp"
              alt=""
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
            />
            <div className="flex flex-col justify-between gap-7 p-6 sm:p-8 lg:p-10">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-white/85">
                  Jogue por uma causa · 28 nov · 15h
                </p>
                <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.9] sm:text-5xl">
                  {TOURNAMENT.name}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/90 sm:text-base">
                  {TOURNAMENT.category} · R$ 150 por equipe. Esporte e conscientização sobre a saúde
                  do homem.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/25 pt-4">
                {TOURNAMENT.prizes.map((prize) => (
                  <span className="min-w-0" key={prize.place}>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-white/80 sm:text-xs">
                      {prize.place}
                    </span>
                    <strong className="mt-1 block font-display text-xl font-extrabold sm:text-2xl">
                      {prize.amount}
                    </strong>
                  </span>
                ))}
              </div>
              <span className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-transform group-hover:translate-x-1">
                Inscreva seu quarteto <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
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
              search={{ unit: "unidade-1" }}
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
