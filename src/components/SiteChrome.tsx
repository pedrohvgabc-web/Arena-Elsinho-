import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  ShieldUser,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE, TOURNAMENT, waLink } from "@/lib/site";
import arenaLogo from "@/assets/arena-leste-logo.webp";

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label={`${SITE.name} — início`}>
      <img
        src={arenaLogo}
        alt={SITE.name}
        width={150}
        height={52}
        className="h-11 w-auto max-w-[150px] rounded-md bg-white px-2 py-1 object-contain"
      />
    </Link>
  );
}

const nav = [
  { href: "/#unidades", label: "Unidades" },
  { href: "/#torneio", label: "Torneio" },
  { href: SITE.instagram, label: "Instagram", external: true },
];

function TournamentRibbon() {
  const message = `${TOURNAMENT.name} · ${TOURNAMENT.category} · ${TOURNAMENT.dateShort} às ${TOURNAMENT.time} · ${TOURNAMENT.entryFee} · Inscreva seu time`;
  return (
    <Link
      to="/torneio"
      className="event-ribbon"
      aria-label={`${message}. Acesse para fazer a pré-inscrição.`}
    >
      <span className="event-ribbon-date">
        28 NOV <span aria-hidden="true">·</span> 15H
      </span>
      <span className="event-ribbon-window" aria-hidden="true">
        <span className="event-ribbon-track">
          {[0, 1].map((copy) => (
            <span className="event-ribbon-copy" key={copy}>
              {message}
              <span className="event-ribbon-star">✳</span>
            </span>
          ))}
        </span>
      </span>
      <span className="event-ribbon-action">
        Inscreva-se <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TournamentRibbon />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-link text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ),
            )}
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/admin">
                <ShieldUser />
                Admin
              </Link>
            </Button>
            <Link
              to="/reservar"
              className="btn-jelly inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              Agendar <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
        {open && (
          <nav
            className="animate-pop border-t border-border bg-background px-4 pb-4 md:hidden"
            aria-label="Menu móvel"
          >
            <a
              href="/#unidades"
              onClick={() => setOpen(false)}
              className="block py-3 text-muted-foreground hover:text-foreground"
            >
              Unidades
            </a>
            <a
              href="/#torneio"
              onClick={() => setOpen(false)}
              className="block py-3 text-muted-foreground hover:text-foreground"
            >
              Torneio Novembro Azul
            </a>
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 py-2 text-muted-foreground hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
              Instagram oficial
            </a>
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 py-2 text-muted-foreground hover:text-primary"
            >
              <ShieldUser className="h-4 w-4" />
              Área administrativa
            </Link>
            <Link
              to="/reservar"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground"
            >
              Escolher unidade <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Esporte de areia, time reunido e boas histórias. A gente se encontra na Arena Leste.
          </p>
          <a
            href={SITE.beacons}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Todos os links oficiais <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-display text-xl font-bold uppercase">
            <MapPin className="h-4 w-4 text-primary" /> Unidades
          </h3>
          <ul className="space-y-4 text-sm text-muted-foreground">
            {SITE.units.map((unit, index) => (
              <li key={unit.id}>
                <span className="block font-semibold text-foreground">Unidade {index + 1}</span>
                <a
                  className="mt-1 block leading-relaxed hover:text-primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {unit.address}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-xl font-bold uppercase">Contato</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <a
                className="flex min-h-10 items-center gap-2 hover:text-primary"
                href={waLink(
                  `Olá! Vim pelo site da ${SITE.shortName} e gostaria de tirar uma dúvida.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
                WhatsApp {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                className="flex min-h-10 items-center gap-2 hover:text-primary"
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-4 w-4 text-primary" />
                @arenalesteoficial
              </a>
            </li>
            <li>
              <Link
                to="/reservar"
                className="inline-flex min-h-10 items-center gap-2 hover:text-primary"
              >
                <Trophy className="h-4 w-4 text-primary" />
                Agendar por unidade
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-xl font-bold uppercase">Informações</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/torneio" className="nav-link hover:text-foreground">
                Torneio Novembro Azul
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className="nav-link hover:text-foreground">
                Privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos" className="nav-link hover:text-foreground">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link to="/cancelamento" className="nav-link hover:text-foreground">
                Cancelamentos
              </Link>
            </li>
            <li>
              <Link to="/admin" className="nav-link hover:text-foreground">
                Administração
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.name}. Porto Velho/RO.
      </p>
    </footer>
  );
}
