import { getDb } from "./db.server";
import { TOURNAMENT } from "./site";
import {
  createInfinitePayCheckout,
  verifyInfinitePayPayment,
  type InfinitePayNotice,
} from "./payments.server";

type BookingCheckoutRow = {
  amount_cents: number;
  expires_at: string | null;
  provider_ref: string;
  checkout_url: string | null;
};
type TournamentCheckoutRow = {
  id: string;
  created_at: string;
  status: string;
  payment_order_nsu: string | null;
  payment_checkout_url: string | null;
  payment_expires_at: string | null;
};
type OrderRow = {
  kind: "booking" | "tournament";
  code: string;
  expected_amount_cents: number;
  status: string;
  requires_review: boolean;
};

export type PaymentProcessingResult = {
  status: "paid" | "review" | "processing" | "not_found";
  kind?: "booking" | "tournament";
  code?: string;
};

export async function ensureBookingCheckout(groupCode: string): Promise<string> {
  const db = getDb();
  const rows = (await db`
    SELECT SUM(b.amount_cents)::int AS amount_cents,
      MIN(b.expires_at)::text AS expires_at,
      p.provider_ref, p.checkout_url
    FROM public.bookings b
    INNER JOIN public.payments p ON p.booking_id = b.id
    WHERE b.group_code = ${groupCode}
      AND p.provider = 'infinitepay'
      AND p.provider_ref IS NOT NULL
    GROUP BY p.provider_ref, p.checkout_url
    LIMIT 1
  `) as unknown as BookingCheckoutRow[];
  const row = rows[0];
  if (!row || !row.expires_at) throw new Error("BOOKING_CHECKOUT_NOT_FOUND");
  const expiry = new Date(row.expires_at);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) {
    throw new Error("BOOKING_CHECKOUT_EXPIRED");
  }
  if (row.checkout_url) return row.checkout_url;
  const checkout = await createInfinitePayCheckout({
    orderNsu: row.provider_ref,
    amountCents: Number(row.amount_cents),
    description: `Reserva Arena Leste ${groupCode}`,
    expiresAt: expiry.toISOString(),
  });
  const saved = await db`
    UPDATE public.payments
    SET checkout_url = ${checkout.checkoutUrl}, updated_at = now()
    WHERE provider = 'infinitepay' AND provider_ref = ${row.provider_ref}
      AND checkout_url IS NULL
    RETURNING checkout_url
  `;
  if (saved[0]) return String((saved[0] as Record<string, unknown>)["checkout_url"]);
  const latest = (await db`
    SELECT checkout_url FROM public.payments
    WHERE provider = 'infinitepay' AND provider_ref = ${row.provider_ref}
    LIMIT 1
  `) as unknown as Array<{ checkout_url: string | null }>;
  if (latest[0]?.checkout_url) return latest[0].checkout_url;
  throw new Error("BOOKING_CHECKOUT_NOT_SAVED");
}

export async function ensureTournamentCheckout(registrationCode: string): Promise<string> {
  const db = getDb();
  const rows = (await db`
    SELECT id::text AS id, created_at::text AS created_at, status,
      payment_order_nsu, payment_checkout_url, payment_expires_at::text AS payment_expires_at
    FROM public.tournament_registrations
    WHERE registration_code = ${registrationCode}
    LIMIT 1
  `) as unknown as TournamentCheckoutRow[];
  const row = rows[0];
  if (!row) throw new Error("TOURNAMENT_REGISTRATION_NOT_FOUND");
  if (row.status === "cancelled") throw new Error("TOURNAMENT_REGISTRATION_CANCELLED");
  const orderNsu = row.payment_order_nsu ?? `ALT-${registrationCode}`;
  const expiry = row.payment_expires_at
    ? new Date(row.payment_expires_at)
    : new Date(new Date(row.created_at).getTime() + 24 * 60 * 60 * 1000);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) {
    await db`
      UPDATE public.tournament_registrations
      SET payment_status = 'expired', payment_expires_at = COALESCE(payment_expires_at, ${expiry.toISOString()}::timestamptz)
      WHERE id = ${row.id}::uuid AND payment_status = 'pending'
    `;
    throw new Error("TOURNAMENT_CHECKOUT_EXPIRED");
  }
  if (row.payment_checkout_url) return row.payment_checkout_url;

  const checkout = await createInfinitePayCheckout({
    orderNsu,
    amountCents: TOURNAMENT.entryFeeCents,
    description: `Inscrição ${TOURNAMENT.name} ${registrationCode}`,
    expiresAt: expiry.toISOString(),
  });
  const saved = await db`
    UPDATE public.tournament_registrations
    SET payment_provider = 'infinitepay', payment_order_nsu = ${orderNsu},
      payment_checkout_url = ${checkout.checkoutUrl},
      payment_expires_at = ${expiry.toISOString()}::timestamptz,
      payment_amount_cents = ${TOURNAMENT.entryFeeCents}, updated_at = now()
    WHERE id = ${row.id}::uuid AND payment_checkout_url IS NULL AND status <> 'cancelled'
    RETURNING payment_checkout_url
  `;
  if (saved[0]) return String((saved[0] as Record<string, unknown>)["payment_checkout_url"]);
  const latest = (await db`
    SELECT payment_checkout_url, status FROM public.tournament_registrations
    WHERE id = ${row.id}::uuid LIMIT 1
  `) as unknown as Array<{ payment_checkout_url: string | null; status: string }>;
  if (latest[0]?.status === "cancelled") throw new Error("TOURNAMENT_REGISTRATION_CANCELLED");
  if (latest[0]?.payment_checkout_url) return latest[0].payment_checkout_url;
  throw new Error("TOURNAMENT_CHECKOUT_NOT_SAVED");
}

async function getOrder(orderNsu: string): Promise<OrderRow | null> {
  const db = getDb();
  if (orderNsu.startsWith("ALB-")) {
    const rows = (await db`
      SELECT 'booking'::text AS kind, b.group_code AS code,
        SUM(b.amount_cents)::int AS expected_amount_cents,
        MIN(b.payment_status)::text AS status,
        (BOOL_OR(p.status = 'paid') AND COUNT(*) FILTER (WHERE b.payment_status = 'paid') < COUNT(*)) AS requires_review
      FROM public.payments p
      INNER JOIN public.bookings b ON b.id = p.booking_id
      WHERE p.provider = 'infinitepay' AND p.provider_ref = ${orderNsu}
      GROUP BY b.group_code
      LIMIT 1
    `) as unknown as OrderRow[];
    return rows[0] ?? null;
  }
  if (orderNsu.startsWith("ALT-")) {
    const rows = (await db`
      SELECT 'tournament'::text AS kind, registration_code AS code,
        payment_amount_cents AS expected_amount_cents, payment_status AS status,
        (status = 'cancelled' AND payment_status = 'paid') AS requires_review
      FROM public.tournament_registrations
      WHERE payment_provider = 'infinitepay' AND payment_order_nsu = ${orderNsu}
      LIMIT 1
    `) as unknown as OrderRow[];
    return rows[0] ?? null;
  }
  return null;
}

export async function processInfinitePayPayment(
  notice: InfinitePayNotice,
  source: "webhook" | "return",
): Promise<PaymentProcessingResult> {
  const order = await getOrder(notice.orderNsu);
  if (!order) return { status: "not_found" };
  if (order.status === "paid") {
    return {
      status: order.requires_review ? "review" : "paid",
      kind: order.kind,
      code: order.code,
    };
  }

  const verification = await verifyInfinitePayPayment({
    orderNsu: notice.orderNsu,
    transactionNsu: notice.transactionNsu,
    slug: notice.slug,
    expectedAmountCents: Number(order.expected_amount_cents),
  });
  if (!verification.valid) return { status: "processing", kind: order.kind, code: order.code };

  const db = getDb();
  const now = new Date().toISOString();
  const result = await db.begin(async (tx) => {
    if (source === "webhook") {
      const payload = JSON.stringify({
        order_nsu: notice.orderNsu,
        transaction_nsu: notice.transactionNsu,
        invoice_slug: notice.slug,
      });
      const inserted = await tx`
        INSERT INTO public.payment_webhook_events (provider, event_id, payload)
        VALUES ('infinitepay', ${notice.eventId}, ${payload}::jsonb)
        ON CONFLICT (provider, event_id) DO NOTHING
        RETURNING id
      `;
      if (!inserted.length) return order.requires_review ? ("review" as const) : ("paid" as const);
    }

    if (order.kind === "booking") {
      await tx`
        SELECT id FROM public.bookings WHERE group_code = ${order.code} FOR UPDATE
      `;
      const counts = (await tx`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE payment_status = 'pending' AND expires_at > ${now}::timestamptz)::int AS active
        FROM public.bookings WHERE group_code = ${order.code}
      `) as unknown as Array<{ total: number; active: number }>;
      const conflicts = (await tx`
        SELECT COUNT(*)::int AS count
        FROM public.bookings b
        INNER JOIN public.bookings other
          ON other.space_id = b.space_id
          AND other.booking_date = b.booking_date
          AND other.slot && b.slot
          AND other.id <> b.id
          AND other.payment_status IN ('pending', 'paid')
        WHERE b.group_code = ${order.code}
      `) as unknown as Array<{ count: number }>;
      const canConfirm =
        Number(counts[0]?.total ?? 0) > 0 &&
        Number(counts[0]?.active ?? 0) === Number(counts[0]?.total ?? 0) &&
        Number(conflicts[0]?.count ?? 0) === 0;

      await tx`
        UPDATE public.payments
        SET status = 'paid', paid_at = ${now}::timestamptz,
          transaction_nsu = CASE WHEN provider_ref = ${notice.orderNsu} THEN ${notice.transactionNsu} ELSE transaction_nsu END,
          invoice_slug = CASE WHEN provider_ref = ${notice.orderNsu} THEN ${notice.slug} ELSE invoice_slug END,
          capture_method = CASE WHEN provider_ref = ${notice.orderNsu} THEN ${verification.captureMethod} ELSE capture_method END,
          updated_at = ${now}::timestamptz
        WHERE booking_id IN (
          SELECT id FROM public.bookings WHERE group_code = ${order.code}
        )
      `;
      if (canConfirm) {
        await tx`
          UPDATE public.bookings
          SET payment_status = 'paid', updated_at = ${now}::timestamptz
          WHERE group_code = ${order.code} AND payment_status = 'pending'
        `;
      }
      if (source === "webhook") {
        await tx`
          UPDATE public.payment_webhook_events SET processed_at = ${now}::timestamptz
          WHERE provider = 'infinitepay' AND event_id = ${notice.eventId}
        `;
      }
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
        SELECT 'infinitepay', ${canConfirm ? "payment.confirmed" : "payment.received_review"},
          'booking', MIN(b.id::text),
          ${JSON.stringify({ orderNsu: notice.orderNsu, captureMethod: verification.captureMethod, source })}::jsonb
        FROM public.bookings b WHERE b.group_code = ${order.code}
      `;
      return canConfirm ? ("paid" as const) : ("review" as const);
    }

    const rows = await tx`
      UPDATE public.tournament_registrations
      SET payment_status = 'paid', payment_paid_at = ${now}::timestamptz,
        payment_capture_method = ${verification.captureMethod},
        payment_transaction_nsu = ${notice.transactionNsu},
        payment_invoice_slug = ${notice.slug},
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
        updated_at = ${now}::timestamptz
      WHERE payment_provider = 'infinitepay' AND payment_order_nsu = ${notice.orderNsu}
      RETURNING id, status
    `;
    if (source === "webhook") {
      await tx`
        UPDATE public.payment_webhook_events SET processed_at = ${now}::timestamptz
        WHERE provider = 'infinitepay' AND event_id = ${notice.eventId}
      `;
    }
    const registrationStatus = rows.length
      ? String((rows[0] as Record<string, unknown>)["status"])
      : "missing";
    if (rows.length) {
      await tx`
        INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
        VALUES ('infinitepay', ${registrationStatus === "cancelled" ? "payment.received_review" : "payment.confirmed"}, 'tournament_registration', ${String((rows[0] as Record<string, unknown>)["id"])}, ${JSON.stringify({ orderNsu: notice.orderNsu, captureMethod: verification.captureMethod, registrationStatus, source })}::jsonb)
      `;
    }
    return rows.length && registrationStatus !== "cancelled"
      ? ("paid" as const)
      : ("review" as const);
  });

  return { status: result, kind: order.kind, code: order.code };
}

export async function knownInfinitePayWebhookEvent(eventId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    SELECT 1 FROM public.payment_webhook_events
    WHERE provider = 'infinitepay' AND event_id = ${eventId} AND processed_at IS NOT NULL
    LIMIT 1
  `;
  return rows.length > 0;
}
