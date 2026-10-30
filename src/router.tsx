import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPendingMs: 0,
    defaultPendingComponent: () => (
      <div className="mx-auto grid min-h-[55vh] max-w-7xl place-items-center px-4 py-16 text-center sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Arena Elsinho
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase">Seu jogo. Seu espaço.</h1>
          <p className="mt-4 text-muted-foreground">
            Carregando a arena e os horários disponíveis…
          </p>
        </div>
      </div>
    ),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
