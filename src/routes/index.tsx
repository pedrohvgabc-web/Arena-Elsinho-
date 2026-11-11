import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { LazyLoopVideo } from "@/components/LazyLoopVideo";
import { TournamentCountdown } from "@/components/TournamentCountdown";
import { SITE, TOURNAMENT, mapEmbedLink, mapSearchLink, waLink } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arena Leste Multi Sports — Vôlei de praia em Porto Velho" },
      {
        name: "description",
        content:
          "Duas unidades com quadras de areia em Porto Velho. Escolha onde jogar e faça seu agendamento online.",
      },
      { property: "og:title", content: "Arena Leste Multi Sports — Vôlei de praia em Porto Velho" },
      {
        property: "og:description",
        content: "Duas unidades com quadras de areia e torneio Novembro Azul em Porto Velho/RO.",
      },
      { property: "og:image", content: SITE.socialImage },
      { property: "og:image:alt", content: "Arena Leste Multi Sports em Porto Velho" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:url", content: SITE.url },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE.socialImage },
    ],
    links: [{ rel: "canonical", href: SITE.url }],
  }),
  component: HomePage,
});

const tickerText =
  "Arena Leste · Vôlei de praia · Duas unidades · Oito quadras de areia · Porto Velho/RO · ";

function HomePage() {
  const [mapUnit, setMapUnit] = useState<(typeof SITE.units)[number]>(SITE.units[0]);

  useEffect(() => {
    const intro = document.querySelector<HTMLElement>("#intro");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (intro && reduced.matches) intro.remove();

    const revealItems = [...document.querySelectorAll<HTMLElement>("#vHome [data-r]")];
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    revealItems.forEach((item) => revealObserver.observe(item));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.target.id;
        if (!active) return;
        document.querySelectorAll<HTMLAnchorElement>("#vHome > nav a.l").forEach((link) => {
          link.classList.toggle("on", link.hash === `#${active}`);
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.35, 0.7] },
    );
    document.querySelectorAll<HTMLElement>("#vHome main section[id]").forEach((section) => {
      sectionObserver.observe(section);
    });

    const progress = document.querySelector<HTMLElement>("#prog");
    let scrollFrame = 0;
    const updateProgress = () => {
      if (!progress || CSS.supports("animation-timeline: scroll()")) return;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.scale = `scale(${available > 0 ? window.scrollY / available : 0}, 1)`;
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });

    const hero = document.querySelector<HTMLElement>("#topo");
    const follower = document.querySelector<HTMLElement>("#fol");
    let heroVisible = false;
    let raf = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    const pointerFine = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const followerOrigin = () => {
      const parent = follower?.offsetParent;
      if (parent instanceof HTMLElement) {
        const bounds = parent.getBoundingClientRect();
        return {
          left: bounds.left + parent.clientLeft,
          top: bounds.top + parent.clientTop,
        };
      }
      const bounds = hero?.getBoundingClientRect();
      return { left: bounds?.left ?? 0, top: bounds?.top ?? 0 };
    };
    const stopFollower = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const animateFollower = () => {
      if (
        !follower ||
        !heroVisible ||
        !pointerFine.matches ||
        reducedMotion.matches ||
        document.hidden
      ) {
        stopFollower();
        return;
      }
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      follower.style.transform = `translate3d(${x - follower.offsetWidth / 2}px,${y - follower.offsetHeight / 2}px,0)`;
      raf = requestAnimationFrame(animateFollower);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!hero || !follower || !pointerFine.matches || reducedMotion.matches) return;
      const origin = followerOrigin();
      targetX = event.clientX - origin.left;
      targetY = event.clientY - origin.top;
      if (!raf) raf = requestAnimationFrame(animateFollower);
    };
    const syncFollower = () => {
      if (!hero || !follower) return;
      const shouldFix = !pointerFine.matches || reducedMotion.matches;
      follower.classList.toggle("is-fixed", shouldFix);
      if (shouldFix) {
        follower.style.transform = "";
        stopFollower();
      } else if (heroVisible && !raf) {
        const bounds = hero.getBoundingClientRect();
        const origin = followerOrigin();
        x = targetX = bounds.left + bounds.width * 0.68 - origin.left;
        y = targetY = bounds.top + bounds.height * 0.78 - origin.top;
        raf = requestAnimationFrame(animateFollower);
      }
    };
    const heroObserver = hero
      ? new IntersectionObserver(([entry]) => {
          heroVisible = Boolean(entry?.isIntersecting);
          if (!heroVisible) stopFollower();
          else syncFollower();
        })
      : undefined;
    if (hero && follower) {
      heroObserver?.observe(hero);
      hero.addEventListener("pointermove", onPointerMove, { passive: true });
      pointerFine.addEventListener("change", syncFollower);
      reducedMotion.addEventListener("change", syncFollower);
      document.addEventListener("visibilitychange", syncFollower);
      syncFollower();
    }

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
      heroObserver?.disconnect();
      window.removeEventListener("scroll", updateProgress);
      cancelAnimationFrame(scrollFrame);
      if (hero) hero.removeEventListener("pointermove", onPointerMove);
      pointerFine.removeEventListener("change", syncFollower);
      reducedMotion.removeEventListener("change", syncFollower);
      document.removeEventListener("visibilitychange", syncFollower);
      stopFollower();
    };
  }, []);

  return (
    <div id="vHome">
      <div id="intro" aria-hidden="true">
        <div>
          <p>Abrindo os espaços da Arena Leste…</p>
          <span />
        </div>
      </div>
      <div id="prog" aria-hidden="true" />

      <nav aria-label="Navegação principal">
        <div className="wrap">
          <a className="logo" href="#topo" aria-label="Arena Leste Multi Sports — início">
            <img
              src="/images/arena-leste-zip-logo.png"
              alt="Arena Leste Multi Sports"
              width="159"
              height="119"
            />
          </a>
          <a className="l" href="#unidades">
            Unidades
          </a>
          <a className="l" href="#torneio">
            Torneio
          </a>
          <a className="l" href="#contato">
            Contato
          </a>
          <a className="l" href={SITE.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <Link className="btn pri" to="/reservar" search={{ unit: "unidade-1" }}>
            Agendar
          </Link>
        </div>
      </nav>

      <header className="hero" id="topo">
        <LazyLoopVideo
          src="/videos/hero-1080p-v1.mp4"
          poster="/images/hero-zip-poster.jpg"
          className="bgv"
        />
        <div className="shade" />
        <div className="wrap">
          <p className="mono">Arena Leste Multi Sports · Porto Velho/RO</p>
          <h1 className="big">
            <span>
              <em style={{ "--i": 0 } as CSSProperties}>Bora pra</em>
            </span>
            <span>
              <em style={{ "--i": 1 } as CSSProperties}>areia?</em>
            </span>
          </h1>
          <p className="lead">
            Esporte de areia, time reunido e boas histórias. A gente se encontra na Arena Leste.
          </p>
          <div className="cta">
            <Link className="btn pri lg" to="/reservar" search={{ unit: "unidade-1" }}>
              Escolher meu horário
            </Link>
            <a className="btn lg" href="#unidades">
              Ver unidades
            </a>
          </div>
          <div className="cue mono">
            <b />
            Role para explorar
          </div>
          <Link
            className="fol"
            id="fol"
            to="/reservar"
            search={{ unit: "unidade-1" }}
            aria-label="Escolher meu horário"
          >
            <span>
              Escolher
              <br />
              meu horário<i>↓</i>
            </span>
          </Link>
        </div>
      </header>

      <div className="mq">
        <Link
          to="/torneio"
          aria-label="Torneio Novembro Azul, 28 de novembro às 15h, R$ 150 por equipe. Inscreva seu time"
        >
          <div id="mq" aria-hidden="true">
            {[0, 1, 2, 3].map((copy) => (
              <span key={copy}>{tickerText}✳ &nbsp;</span>
            ))}
          </div>
        </Link>
      </div>

      <section
        className="strip"
        id="inscricao"
        aria-label="Demonstração do campeonato Novembro Azul"
      >
        <LazyLoopVideo
          src="/videos/campeonato-camera-lenta-1080p60-v1.mp4"
          poster="/images/campeonato-zip-poster.jpg"
          className="sv"
        />
        <div className="stint" />
        <div className="sc wrap">
          <span className="mono slow">● Câmera lenta 60 fps · Campeonato · 28/11 · 15h</span>
          <h2 data-r>
            Novembro
            <br />
            <b>Azul</b>
          </h2>
          <p data-r>Quarteto masculino · R$ 150 por equipe. Chame seu time e entre na areia.</p>
          <Link className="btn pri lg pulse" to="/torneio">
            Inscreva seu time
          </Link>
        </div>
        <div className="sm" aria-hidden="true">
          <div id="sm">
            {[0, 1, 2, 3].map((copy) => (
              <span key={copy}>
                28 NOV · 15H · QUARTETO MASCULINO · R$ 150 POR EQUIPE · ✳ &nbsp;
              </span>
            ))}
          </div>
        </div>
      </section>

      <main id="conteudo">
        <section className="sec" id="unidades">
          <div className="wrap">
            <div className="sh" data-r>
              <span className="mono">01 — Unidades</span>
              <h2>
                Duas casas.
                <br />
                Areia de sobra.
              </h2>
              <p>Escolha onde jogar. Toque numa unidade para escolher seu horário.</p>
            </div>
            <ul className="units" data-r>
              {SITE.units.map((unit, index) => (
                <li key={unit.id}>
                  <Link className="unit" to="/reservar" search={{ unit: unit.id }}>
                    <span className="mono">Unidade {index + 1}</span>
                    <div>
                      <h3>{index === 0 ? "Cuniã" : "Pinheiro Machado"}</h3>
                      <p>{unit.address}</p>
                    </div>
                    <span className="go" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div data-r style={{ marginTop: "var(--s2)" }}>
              <p className="mono">Precisa negociar um horário diferente?</p>
              <a
                className="btn pri lg"
                href={waLink("Quero fazer reserva de um horário diferenciado!")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Quero fazer reserva de um horário diferenciado! →
              </a>
            </div>
            <div className="mapblock" data-r>
              <div className="maphead">
                <div>
                  <span className="mono">Mapa interativo</span>
                  <p>Selecione a unidade para localizar o endereço.</p>
                </div>
                <div className="mapchoices" role="group" aria-label="Escolher unidade no mapa">
                  {SITE.units.map((unit, index) => (
                    <button
                      key={unit.id}
                      type="button"
                      className="opt"
                      aria-pressed={mapUnit.id === unit.id}
                      onClick={() => setMapUnit(unit)}
                    >
                      Unidade {index + 1}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mapaddress">{mapUnit.address}</p>
              <iframe
                key={mapUnit.id}
                className="mapframe"
                title={`Mapa interativo — ${mapUnit.name}`}
                src={mapEmbedLink(mapUnit)}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <a
                className="maplink mono"
                href={mapSearchLink(mapUnit)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir localização no Google Maps ↗
              </a>
            </div>
            <p data-r style={{ marginTop: "var(--s2)" }}>
              <Link className="btn pri lg" to="/reservar" search={{ unit: "unidade-1" }}>
                Escolher meu horário
              </Link>
            </p>
          </div>
        </section>

        <section className="sec" id="torneio">
          <div className="wrap tor">
            <div data-r>
              <span className="mono">02 — Torneio</span>
              <h2>
                Novembro <b>Azul</b>
              </h2>
              <div className="facts">
                <div>
                  <span className="mono">Quando</span>
                  <b>28/11/2026 · 15h</b>
                </div>
                <div>
                  <span className="mono">Formato</span>
                  <b>Quarteto masculino</b>
                </div>
                <div>
                  <span className="mono">Inscrição</span>
                  <b>R$ 150 por equipe</b>
                </div>
              </div>
              <Link className="btn pri lg" to="/torneio">
                Inscreva seu time
              </Link>
              <p className="tor-health">
                Saúde, esporte e conscientização sobre a saúde do homem. Vem participar!
              </p>
            </div>
            <div data-r>
              <p className="mono">Faltam para a primeira bola</p>
              <TournamentCountdown />
            </div>
          </div>
        </section>

        <section className="sec" id="contato">
          <div className="wrap">
            <div className="sh" data-r>
              <span className="mono">03 — Contato</span>
              <h2>Fala com a gente</h2>
              <p>Dúvidas, horários ou grupo grande? Resposta rápida pelo WhatsApp.</p>
            </div>
            <div className="ct" data-r>
              <a
                href={waLink(
                  `Olá! Vim pelo site da ${SITE.shortName} e gostaria de tirar uma dúvida.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="mono">WhatsApp</span>
                <b>{SITE.phoneDisplay}</b>
              </a>
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
                <span className="mono">Instagram</span>
                <b>@arenalesteoficial</b>
              </a>
              <a href={SITE.beacons} target="_blank" rel="noopener noreferrer">
                <span className="mono">Links oficiais</span>
                <b>Todos os links</b>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mono">
        <div className="wrap">
          <span>© {new Date().getFullYear()} Arena Leste Multi Sports. Porto Velho/RO.</span>
          <nav aria-label="Links do rodapé">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
            <Link to="/cancelamento">Cancelamentos</Link>
            <Link to="/admin">Administração</Link>
          </nav>
        </div>
      </footer>
      <a
        className="wpp"
        href={waLink(
          `Olá! Vim pelo site da ${SITE.shortName} e gostaria de informações sobre agendamento.`,
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        Fale no WhatsApp
      </a>
    </div>
  );
}
