import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { SITE, mapEmbedLink, mapSearchLink, type ArenaUnit } from "@/lib/site";

export function UnitMap() {
  const [selected, setSelected] = useState<ArenaUnit>(SITE.units[0]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
      <div className="flex flex-col gap-3">
        {SITE.units.map((unit, index) => {
          const active = selected.id === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(unit)}
              className={`rounded-2xl border p-5 text-left transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card hover:border-primary/50"}`}
            >
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <MapPin className="h-4 w-4" /> Unidade {index + 1}
              </span>
              <span className="mt-2 block font-display text-2xl font-bold uppercase text-foreground">
                {unit.name}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                {unit.address}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {unit.note}
              </span>
            </button>
          );
        })}
        <a
          href={mapSearchLink(selected)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-jelly inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
        >
          Abrir rota no Google Maps <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="min-h-[320px] overflow-hidden rounded-2xl border border-border bg-card lg:min-h-[430px]">
        <iframe
          key={selected.id}
          title={`Mapa interativo — ${selected.name}`}
          src={mapEmbedLink(selected)}
          className="h-full min-h-[320px] w-full border-0 lg:min-h-[430px]"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
