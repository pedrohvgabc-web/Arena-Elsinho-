import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { SITE, bookingLink, mapSearchLink } from "@/lib/site";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Agende sua unidade — Arena Leste Multi Sports" },
      {
        name: "description",
        content:
          "Escolha a Unidade 1 ou 2 e consulte a disponibilidade pelo WhatsApp oficial da Arena Leste.",
      },
      { property: "og:title", content: "Agende sua unidade — Arena Leste" },
      {
        property: "og:description",
        content: "Dois contatos diretos para escolher onde jogar em Porto Velho.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: Reservar,
});

function Reservar() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <Link
        to="/"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao início
      </Link>
      <div className="mt-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
          Atendimento direto
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
          Onde vamos
          <br />
          jogar hoje?
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Escolha a unidade. O WhatsApp vai abrir com uma mensagem pronta para consultar a
          disponibilidade; a reserva só fica confirmada após o retorno da equipe.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {SITE.units.map((unit, index) => (
          <article key={unit.id} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <MapPin className="h-3.5 w-3.5" /> Unidade {index + 1}
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold uppercase">{unit.name}</h2>
            <p className="mt-3 text-muted-foreground">{unit.address}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{unit.note}</p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={bookingLink(unit)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" /> Agendar na Unidade {index + 1}{" "}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={mapSearchLink(unit)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" /> Ver endereço no mapa
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Os horários, valores e a confirmação são informados diretamente pela Arena no WhatsApp. O
        endereço da Unidade 2 aparece com números diferentes em publicações; confirme o ponto antes
        de ir.
      </p>
    </div>
  );
}
