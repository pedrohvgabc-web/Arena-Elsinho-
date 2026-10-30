import { createFileRoute } from "@tanstack/react-router";

// Idempotent payment webhook. The provider adapter verifies the payment with the provider.
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getProvider } = await import("@/lib/payments.server");
        const provider = getProvider();
        const raw = request.clone();
        const event = await provider.parseWebhook(request);
        if (!event) return new Response("invalid", { status: 400 });

        const { getDb } = await import("@/lib/db.server");
        const db = getDb();
        const payload = await raw.json().catch(() => ({}));
        const now = new Date().toISOString();
        await db.begin(async (tx) => {
          const inserted = await tx`
            INSERT INTO public.payment_webhook_events (provider, event_id, payload)
            VALUES (${provider.name}, ${event.eventId}, ${JSON.stringify(payload)}::jsonb)
            ON CONFLICT (provider, event_id) DO NOTHING
            RETURNING id
          `;
          if (!inserted.length) return; // already processed or being processed

          // Update provider payment and matching booking state in the same transaction.
          await tx`
            WITH matched_groups AS (
              SELECT DISTINCT b.group_code
              FROM public.payments p
              JOIN public.bookings b ON b.id = p.booking_id
              WHERE p.provider = ${provider.name} AND p.provider_ref = ${event.ref}
            ), changed_payments AS (
              UPDATE public.payments
              SET status = ${event.status},
                  paid_at = ${event.status === "paid" ? now : null}::timestamptz,
                  updated_at = ${now}::timestamptz
              WHERE booking_id IN (
                SELECT b.id FROM public.bookings b
                WHERE b.group_code IN (SELECT group_code FROM matched_groups)
              )
              RETURNING booking_id
            )
            UPDATE public.bookings
            SET payment_status = ${event.status}, updated_at = ${now}::timestamptz
            WHERE id IN (SELECT booking_id FROM changed_payments)
          `;
          await tx`
            UPDATE public.payment_webhook_events SET processed_at = ${now}::timestamptz
            WHERE provider = ${provider.name} AND event_id = ${event.eventId}
          `;
        });

        // Duplicates are acknowledged so the provider will not retry them.
        return new Response("ok");
      },
    },
  },
});
