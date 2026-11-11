import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { verifyPaymentReturn } from "@/lib/arena.functions";
import { SITE, waLink } from "@/lib/site";

export const Route = createFileRoute("/pagamento/retorno")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_nsu: typeof search["order_nsu"] === "string" ? search["order_nsu"].slice(0, 100) : "",
    transaction_nsu:
      typeof search["transaction_nsu"] === "string" ? search["transaction_nsu"].slice(0, 160) : "",
    slug: typeof search["slug"] === "string" ? search["slug"].slice(0, 160) : "",
  }),
  head: () => ({
    meta: [{ title: `Pagamento — ${SITE.name}` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const search = Route.useSearch();
  const verify = useServerFn(verifyPaymentReturn);
  const canVerify = Boolean(search.order_nsu && search.transaction_nsu && search.slug);
  const query = useQuery({
    queryKey: ["infinitepay-return", search.order_nsu, search.transaction_nsu, search.slug],
    queryFn: () =>
      verify({
        data: {
          orderNsu: search.order_nsu,
          transactionNsu: search.transaction_nsu,
          slug: search.slug,
        },
      }),
    enabled: canVerify,
    retry: false,
    refetchInterval: (current) =>
      current.state.data?.status === "processing" && current.state.dataUpdateCount < 24
        ? 5000
        : false,
  });

  const result = query.data;
  const confirmed = result?.status === "paid";
  const review = result?.status === "review";
  const waiting =
    canVerify && !query.isError && !confirmed && !review && result?.status !== "not_found";
  const message = `Olá! Voltei do checkout InfinitePay e gostaria de confirmar meu pagamento. Pedido ${search.order_nsu || "sem código"}.`;

  return (
    <section className="mx-auto my-12 w-[min(100%-2rem,42rem)] rounded-3xl border border-border bg-card p-6 shadow-lg sm:my-20 sm:p-10">
      <div
        className={`grid h-14 w-14 place-items-center rounded-full ${confirmed ? "bg-success/15 text-success" : review ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}
        aria-hidden="true"
      >
        {confirmed ? (
          <CheckCircle2 className="h-7 w-7" />
        ) : review ? (
          <CircleAlert className="h-7 w-7" />
        ) : (
          <LoaderCircle className="h-7 w-7 animate-spin" />
        )}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
        Arena Leste · Checkout seguro
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
        {confirmed
          ? "Pagamento confirmado"
          : review
            ? "Pagamento recebido"
            : result?.status === "not_found" || !canVerify
              ? "Confira seu pagamento"
              : "Confirmando pagamento"}
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {confirmed
          ? `A InfinitePay confirmou o pagamento${result.kind === "tournament" ? " da inscrição" : " da reserva"}. Guarde o código ${result.code ?? search.order_nsu}.`
          : review
            ? result.kind === "tournament"
              ? "A InfinitePay confirmou o pagamento, mas a equipe consta como cancelada. Fale com a Arena: o pagamento não reativa automaticamente a inscrição."
              : "A InfinitePay confirmou o pagamento, mas a reserva precisa de conferência da equipe. Fale com a Arena antes de considerar o horário confirmado."
            : result?.status === "not_found" || !canVerify
              ? "Não foi possível validar os dados de retorno. Entre em contato com a Arena e informe o código do pedido."
              : "Estamos consultando a InfinitePay diretamente. Esta página de retorno, sozinha, não confirma que o pagamento foi aprovado."}
      </p>
      {query.isError && (
        <p role="status" className="mt-4 rounded-xl bg-warning/10 p-4 text-sm text-warning">
          A consulta está temporariamente indisponível. A confirmação também é recebida pelo
          webhook; tente atualizar esta página em instantes.
        </p>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          to={result?.kind === "tournament" ? "/torneio" : "/reservar"}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground"
        >
          {result?.kind === "tournament" ? "Voltar ao torneio" : "Voltar às reservas"}
        </Link>
        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-5 font-semibold hover:border-primary hover:text-primary"
        >
          Falar com a Arena
        </a>
      </div>
      {waiting && (
        <p className="mt-5 text-xs text-muted-foreground">
          A consulta automática tentará por até 2 minutos. O webhook também pode confirmar o
          pagamento depois; se o status não mudar, fale com a Arena.
        </p>
      )}
    </section>
  );
}
