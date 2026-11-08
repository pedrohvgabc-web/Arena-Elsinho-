import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:uppercase [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:space-y-1 [&_ul]:text-muted-foreground">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{SITE.name}</p>
      <h1 className="mt-3 text-5xl font-bold uppercase">{title}</h1>
      <p className="text-sm">Última atualização: novembro de 2026</p>
      {children}
    </article>
  );
}

export const legalMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — ${SITE.name}` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — ${SITE.name}` },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ],
});
