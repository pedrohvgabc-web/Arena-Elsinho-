import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Header, Footer } from "@/components/SiteChrome";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { SITE } from "@/lib/site";

import appCss from "../styles.css?url";
import zipCss from "../arena-zip.css?url";
import zipAdaptCss from "../arena-zip-adapt.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const organizationJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE.url,
  logo: SITE.logoUrl,
  sameAs: [SITE.instagram, SITE.beacons],
  telephone: `+${SITE.whatsapp}`,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-4 text-muted-foreground">Página não encontrada.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FFFAF5" },
      { title: "Arena Leste Multi Sports — Vôlei de praia em Porto Velho" },
      {
        name: "description",
        content: `${SITE.name}: esporte de areia, duas unidades em Porto Velho/RO e agendamento online direto pelo site.`,
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: zipCss },
      { rel: "stylesheet", href: zipAdaptCss },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: "/favicon.png", sizes: "512x512" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hasZipLayout = ["/", "/reservar", "/torneio", "/admin"].includes(pathname);
  return (
    <QueryClientProvider client={queryClient}>
      <a href="#conteudo" className="skip">
        Ir ao conteúdo
      </a>
      {hasZipLayout ? (
        <Outlet />
      ) : (
        <>
          <Header />
          <main id="conteudo">
            <Outlet />
          </main>
          <Footer />
          <WhatsAppFloat />
        </>
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
