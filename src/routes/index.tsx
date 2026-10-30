import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Timer, Lightbulb, ShowerHead, Coffee, Heart, Play, Trophy, Target, Handshake, ArrowRight } from "lucide-react";
import hero from "@/assets/hero.webp";
import heroVideo from "@/assets/hero-video.mp4.asset.json";
import escolinha from "@/assets/escolinha.webp.asset.json";
import bancada from "@/assets/bancada.webp.asset.json";
import { getSpaces } from "@/lib/arena.functions";
import { SPACE_IMAGES } from "@/lib/space-images";
import { arenaNow, openingWindows, weekdayOf, formatBRL } from "@/lib/arena-rules";
import { SITE, waLink } from "@/lib/site";
import { Reveal, Magnetic, Tilt } from "@/components/motion";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arena Elsinho — Futebol society, vôlei de areia e escolinha" },
      { name: "description", content: "Reserve online campos de futebol society e quadra de vôlei de areia. Escolinha Elsinho com matrículas abertas para 5 a 17 anos." },
      { property: "og:title", content: "Arena Elsinho — Seu jogo. Seu espaço." },
      { property: "og:description", content: "Reserve seu horário online em poucos cliques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getSpaces(),
  component: Index,
});

function OpenStatus() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const n = arenaNow();
    const open = openingWindows(weekdayOf(n.date)).some(([a, b]) => n.minutes >= a && n.minutes < b);
    setLabel(open ? "Aberto agora" : "Fechado agora");
  }, []);
  if (!label) return null;
  const open = label === "Aberto agora";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-sm backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${open ? "bg-success animate-pulse" : "bg-warning"}`} aria-hidden />
      {label}
    </span>
  );
}

/** Hero spotlight follows the cursor; image drifts with scroll (parallax). */
function useHeroFx() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    let raf = 0;
    const scroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => el.style.setProperty("--py", `${window.scrollY * 0.22}px`));
    };
    el.addEventListener("mousemove", move);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      el.removeEventListener("mousemove", move);
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

const TICKER = ["Futebol society", "Vôlei de areia", "Escolinha Elsinho", "Reserve online", "Seu jogo. Seu espaço."];

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="marquee overflow-hidden border-y border-border bg-card/60 py-4" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {items.map((t, i) => (
              <span key={`${half}-${i}`} className="flex items-center font-display text-xl font-bold uppercase tracking-wider text-muted-foreground">
                <span className="px-6">{t}</span>
                <span className="text-primary">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Index() {
  const spaces = Route.useLoaderData();
  const heroRef = useHeroFx();
  return (
    <>
      <section ref={heroRef} className="relative isolate min-h-[88vh] overflow-hidden">
        <img
          src={hero}
          alt="Campo de futebol society iluminado à noite"
          width={1920}
          height={1088}
          fetchPriority="high" decoding="async" className="hero-img absolute inset-0 -z-20 h-full w-full object-cover"
          style={{ translate: "0 var(--py, 0px)" }}
        />
        <video
          src={heroVideo.url}
          poster={hero}
          autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden"
        />
        <div className="absolute inset-0 -z-10 bg-hero-fade" />
        <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-20 sm:px-6">
          <Reveal><div><OpenStatus /></div></Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 max-w-4xl text-6xl font-extrabold uppercase leading-[0.9] sm:text-8xl lg:text-9xl">
              Seu jogo.<br /><span className="text-primary">Seu espaço.</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">A arena que transforma cada partida em memória.</p>
          </Reveal>
          <Reveal delay={340}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link to="/reservar" className="btn-jelly inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-glow">Reservar agora <ArrowRight className="h-4 w-4" /></Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <a href="#arena" className="inline-flex min-h-12 items-center rounded-full border border-border bg-card/50 px-7 font-semibold backdrop-blur transition-colors hover:bg-card">Conheça a arena</a>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      <Ticker />

      <section id="espacos" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Espaços</p>
          <h2 className="mt-2 text-5xl font-bold uppercase sm:text-6xl">Escolha onde jogar</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {spaces.map((s, i) => (
            <Reveal key={s.id} delay={i * 120}>
              <Tilt max={7} className="h-full rounded-2xl">
                <article className="group h-full overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60">
                  <div className="aspect-video overflow-hidden">
                    <img src={SPACE_IMAGES[s.id]} alt={s.name} loading="lazy" decoding="async" width={1366} height={768} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.sport}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{s.active ? "Disponível" : "Indisponível"}</span>
                    </div>
                    <h3 className="mt-2 text-2xl font-bold uppercase">{s.name}</h3>
                    <ul className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />Até {s.capacity} jogadores</li>
                      <li className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-primary" />{s.slot_minutes} min</li>
                    </ul>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-lg font-bold">{formatBRL(s.price_cents)}<span className="text-sm font-normal text-muted-foreground">/hora</span></span>
                      <Link to="/reservar" search={{ espaco: s.id }} className="btn-jelly rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Reservar</Link>
                    </div>
                  </div>
                </article>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="arena" className="scroll-mt-20 border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">A arena</p>
            <h2 className="mt-2 text-5xl font-bold uppercase sm:text-6xl">Conheça nosso espaço</h2>
            <p className="mt-6 text-lg text-muted-foreground">Estrutura pensada para quem joga por paixão: gramado sintético, areia tratada e um ambiente acolhedor para times, amigos e famílias.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[[Lightbulb, "Iluminação de qualidade"], [ShowerHead, "Vestiários"], [Coffee, "Área de convivência"], [Heart, "Ambiente familiar"]].map(([Icon, t], i) => {
                const I = Icon as typeof Lightbulb;
                return (
                  <li key={t as string} className="btn-jelly flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/50" style={{ transitionDelay: `${i * 30}ms` }}>
                    <I className="h-5 w-5 text-primary" />{t as string}
                  </li>
                );
              })}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <Tilt max={6} className="rounded-2xl">
              <img src={bancada.url} alt="Bancada e área de convivência da Arena Elsinho" loading="lazy" decoding="async" width={1024} height={768} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            </Tilt>
            <a href={SITE.reel} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"><Play className="h-4 w-4" />Assistir vídeo no Instagram <ArrowRight className="h-4 w-4" /></a>
          </Reveal>
        </div>
      </section>

      <section id="escolinha" className="mx-auto grid max-w-7xl scroll-mt-20 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <Tilt max={5} className="rounded-2xl">
            <img src={escolinha.url} alt="Escolinha Elsinho: informações sobre os treinos e turmas" loading="lazy" decoding="async" width={768} height={768} className="aspect-square w-full rounded-2xl object-contain" />
          </Tilt>
        </Reveal>
        <div>
          <Reveal>
            <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">Matrículas abertas</span>
            <h2 className="mt-4 text-5xl font-bold uppercase sm:text-6xl">Escolinha Elsinho</h2>
            <p className="mt-4 text-lg text-muted-foreground">Futebol para crianças e adolescentes de <strong className="text-foreground">5 a 17 anos</strong>, com acompanhamento e muito incentivo.</p>
          </Reveal>
          <ul className="mt-8 space-y-4">
            {[[Target, "Fundamentos", "Técnica, passe, domínio e finalização."], [Trophy, "Disciplina", "Respeito, foco e compromisso dentro e fora de campo."], [Handshake, "Trabalho em equipe", "Aprender a jogar e vencer juntos."]].map(([Icon, t, d], i) => {
              const I = Icon as typeof Target;
              return (
                <Reveal key={t as string} delay={i * 120}>
                  <li className="flex gap-4">
                    <span className="logo-mark grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card"><I className="h-5 w-5 text-primary" /></span>
                    <div><p className="font-semibold">{t as string}</p><p className="text-sm text-muted-foreground">{d as string}</p></div>
                  </li>
                </Reveal>
              );
            })}
          </ul>
          <Reveal delay={200}>
            <Magnetic>
              <a href={waLink("Olá! Quero informações sobre matrícula na Escolinha Elsinho.")} target="_blank" rel="noopener noreferrer" className="btn-jelly mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-glow">Matricular pelo WhatsApp</a>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  );
}
