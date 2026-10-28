import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Instagram, MessageCircle, MapPin, Clock, ShieldUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE, waLink } from "@/lib/site";
import { Magnetic } from "@/components/motion";
import arenaLogo from "@/assets/arena-elsinho-logo.webp";

export function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-xl font-bold uppercase sm:text-2xl" aria-label="Arena Elsinho — início">
      <img src={arenaLogo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
      <span className="truncate">Arena <span className="text-primary">Elsinho</span></span>
    </Link>
  );
}

const nav = [
  { href: "/#espacos", label: "Espaços" },
  { href: "/#escolinha", label: "Escolinha" },
  { href: "/#arena", label: "A arena" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 sm:px-6 md:flex md:justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="nav-link text-sm text-muted-foreground transition-colors hover:text-foreground">{n.label}</a>
          ))}
          <Link to="/reservar" className="nav-link text-sm text-muted-foreground transition-colors hover:text-foreground">Reservar horário</Link>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground"><Link to="/admin"><ShieldUser />Admin</Link></Button>
          <Magnetic strength={0.3}>
            <Link to="/reservar" className="btn-jelly rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">Reservar agora</Link>
          </Magnetic>
        </nav>
        <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground md:hidden"><Link to="/admin" aria-label="Administrador" title="Administrador"><ShieldUser className="h-4 w-4" /></Link></Button>
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav className="animate-pop border-t border-border px-4 pb-4 md:hidden" aria-label="Menu móvel">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3 text-muted-foreground transition-colors hover:text-foreground">{n.label}</a>
          ))}
          <Link to="/reservar" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-primary py-3 text-center font-bold text-primary-foreground">Reservar agora</Link>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1"><Logo /><p className="mt-4 text-sm text-muted-foreground">Cada partida, uma experiência simples, organizada e memorável.</p></div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold uppercase"><Clock className="h-4 w-4 text-primary" /> Horários</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Segunda: 09:00 – 18:00</li>
            <li>Terça a sábado: 08:00 – 12:00 e 14:00 – 23:59</li>
            <li>Domingo: fechado</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold uppercase">Contato</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /><a className="hover:text-foreground transition-colors" href={`https://www.google.com/maps/search/?api=1&query=${SITE.addressQuery}`} target="_blank" rel="noopener noreferrer">{SITE.address}</a></li>
            <li><a className="nav-link flex w-fit gap-2 transition-colors hover:text-foreground" href={waLink("Olá! Vim pelo site da Arena Elsinho.")} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-primary" />WhatsApp {SITE.phoneDisplay}</a></li>
            <li><a className="nav-link flex w-fit gap-2 transition-colors hover:text-foreground" href={SITE.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4 text-primary" />Instagram</a></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold uppercase">Legal</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacidade" className="nav-link transition-colors hover:text-foreground">Política de privacidade</Link></li>
            <li><Link to="/termos" className="nav-link transition-colors hover:text-foreground">Termos de uso</Link></li>
            <li><Link to="/cancelamento" className="nav-link transition-colors hover:text-foreground">Política de cancelamento</Link></li>
            <li><Button asChild variant="ghost" className="mt-2 min-h-11 px-0 text-muted-foreground"><Link to="/admin"><ShieldUser />Área do administrador</Link></Button></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Arena Elsinho</p>
    </footer>
  );
}
