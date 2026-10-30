import { createFileRoute } from "@tanstack/react-router";

// Idempotent payment webhook. The provider adapter must verify the signature.
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getProvider } = await import("@/lib/payments.server");
        const provider = getProvider();
        const raw = request.clone();
        const event = await provider.parseWebhook(request);
        if (!event) return new Response("invalid", { status: 400 });
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { error: dup } = await db.from("payment_webhook_events").insert({
          provider: provider.name, event_id: event.eventId, payload: (await raw.json().catch(() => ({}))) as never,
        });
        if (dup) return new Response("ok"); // already processed
        const now = new Date().toISOString();
        const { data: pays } = await db.from("payments").update({ status: event.status, paid_at: event.status === "paid" ? now : null, updated_at: now })
          .eq("provider", provider.name).eq("provider_ref", event.ref).select("booking_id");
        const ids = (pays ?? []).map((p) => p.booking_id);
        if (ids.length) await db.from("bookings").update({ payment_status: event.status, updated_at: now }).in("id", ids);
        await db.from("payment_webhook_events").update({ processed_at: now }).eq("provider", provider.name).eq("event_id", event.eventId);
        return new Response("ok");
      },
    },
  },
});
