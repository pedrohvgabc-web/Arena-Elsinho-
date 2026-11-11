import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getPaymentMode, parseInfinitePayWebhook } = await import("@/lib/payments.server");
        if (getPaymentMode() !== "infinitepay") {
          // No checkout real pode ser criado neste modo; não retenha retries de eventos antigos.
          return new Response("ignored", { status: 200 });
        }
        const notice = await parseInfinitePayWebhook(request);
        if (!notice) return new Response("invalid", { status: 400 });

        try {
          const processor = await import("@/lib/payment-processing.server");
          if (await processor.knownInfinitePayWebhookEvent(notice.eventId)) {
            return new Response("ok", { status: 200 });
          }
          const result = await processor.processInfinitePayPayment(notice, "webhook");
          if (result.status === "not_found") return new Response("unknown order", { status: 400 });
          if (result.status === "processing") return new Response("not verified", { status: 503 });
          return new Response("ok", { status: 200 });
        } catch {
          // Retorne erro transitório para a InfinitePay tentar novamente; nunca logue payload ou segredo.
          return new Response("retry", { status: 503 });
        }
      },
    },
  },
});
