import { SITE } from "./site";

export type PaymentMode = "demo" | "infinitepay" | "unavailable";
export type InfinitePayCheckout = {
  provider: "infinitepay";
  ref: string;
  checkoutUrl: string;
  simulated: false;
};
export type PixCharge = { provider: string; ref: string; payload: string; simulated: boolean };
export type InfinitePayNotice = {
  eventId: string;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
};
export type InfinitePayVerification = {
  valid: boolean;
  amountCents: number | null;
  captureMethod: "pix" | "credit_card" | null;
};

type InfinitePayCredentials = { apiKey: string; handle: string };

const API_BASE = "https://api.checkout.infinitepay.io";

/** Safe to expose to the frontend: this reports only the mode, never credentials. */
export function getPaymentMode(): PaymentMode {
  if (process.env["INFINITEPAY_ENABLED"] !== "true") return "demo";
  const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim() ?? "";
  const handle = process.env["INFINITEPAY_HANDLE"]?.trim().replace(/^\$/, "") ?? "";
  return /^inchk_[A-Za-z0-9_-]{16,}$/.test(apiKey) && /^[A-Za-z0-9._-]{2,80}$/.test(handle)
    ? "infinitepay"
    : "unavailable";
}

function credentials(): InfinitePayCredentials {
  const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim() ?? "";
  const handle = process.env["INFINITEPAY_HANDLE"]?.trim().replace(/^\$/, "") ?? "";
  if (
    getPaymentMode() !== "infinitepay" ||
    !/^inchk_[A-Za-z0-9_-]{16,}$/.test(apiKey) ||
    !/^[A-Za-z0-9._-]{2,80}$/.test(handle)
  ) {
    throw new Error("INFINITEPAY_NOT_CONFIGURED");
  }
  return { apiKey, handle };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function postJson(url: string, body: Record<string, unknown>) {
  const { apiKey } = credentials();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("INFINITEPAY_NETWORK_ERROR");
  }
  if (!response.ok) throw new Error("INFINITEPAY_REQUEST_FAILED");
  const result: unknown = await response.json().catch(() => null);
  if (!isRecord(result)) throw new Error("INFINITEPAY_INVALID_RESPONSE");
  return result;
}

export async function createInfinitePayCheckout(input: {
  orderNsu: string;
  amountCents: number;
  description: string;
  expiresAt: string;
  customer?: { name: string; phoneNumber: string };
}): Promise<InfinitePayCheckout> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 100) {
    throw new Error("INFINITEPAY_INVALID_AMOUNT");
  }
  const expiresAt = new Date(input.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("INFINITEPAY_INVALID_EXPIRATION");
  }
  const { handle } = credentials();
  const payload: Record<string, unknown> = {
    handle,
    items: [
      {
        description: input.description.slice(0, 120),
        price: input.amountCents,
        quantity: 1,
      },
    ],
    order_nsu: input.orderNsu,
    redirect_url: `${SITE.url}/pagamento/retorno`,
    webhook: {
      url: `${SITE.url}/api/public/payments/webhook`,
      events: ["paid"],
    },
    options: {
      single_payment: true,
      require_delivery_address: false,
      valid_until: expiresAt.toISOString(),
      // InfinitePay documents that credit card is always available; this only enables Pix.
      payment_methods_enabled: ["pix"],
    },
  };
  const customerName = input.customer?.name.trim().slice(0, 80) ?? "";
  const phoneDigits = input.customer?.phoneNumber.replace(/\D/g, "") ?? "";
  if (customerName.length >= 2 && /^(?:55)?[1-9]{2}9?\d{8}$/.test(phoneDigits)) {
    payload["customer"] = {
      name: customerName,
      phone_number: phoneDigits.startsWith("55") ? `+${phoneDigits}` : `+55${phoneDigits}`,
    };
  }
  const result = await postJson(`${API_BASE}/links`, payload);

  const rawUrl = result["url"] ?? result["checkout_url"] ?? result["link"];
  if (typeof rawUrl !== "string" || rawUrl.length > 2048) {
    throw new Error("INFINITEPAY_INVALID_CHECKOUT_URL");
  }
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(rawUrl);
  } catch {
    throw new Error("INFINITEPAY_INVALID_CHECKOUT_URL");
  }
  if (checkoutUrl.protocol !== "https:") throw new Error("INFINITEPAY_INVALID_CHECKOUT_URL");

  return {
    provider: "infinitepay",
    ref: input.orderNsu,
    checkoutUrl: checkoutUrl.toString(),
    simulated: false,
  };
}

export async function verifyInfinitePayPayment(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  expectedAmountCents: number;
}): Promise<InfinitePayVerification> {
  const { handle } = credentials();
  const result = await postJson(`${API_BASE}/payment_check`, {
    handle,
    order_nsu: input.orderNsu,
    transaction_nsu: input.transactionNsu,
    slug: input.slug,
  });
  const amount = result["amount"];
  const captureMethod = result["capture_method"];
  const amountCents = typeof amount === "number" && Number.isSafeInteger(amount) ? amount : null;
  const method = captureMethod === "pix" || captureMethod === "credit_card" ? captureMethod : null;
  return {
    valid:
      result["success"] === true &&
      result["paid"] === true &&
      amountCents === input.expectedAmountCents &&
      method !== null,
    amountCents,
    captureMethod: method,
  };
}

/**
 * InfinitePay webhook bodies are notices, not proof of payment. This parser extracts only the
 * identifiers needed for a server-to-server payment_check; no payload or PII is logged.
 */
export async function parseInfinitePayWebhook(req: Request): Promise<InfinitePayNotice | null> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) return null;
  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body)) return null;
  const orderNsu = body["order_nsu"];
  const transactionNsu = body["transaction_nsu"];
  const slug = body["invoice_slug"] ?? body["slug"];
  if (
    typeof orderNsu !== "string" ||
    orderNsu.length < 3 ||
    orderNsu.length > 100 ||
    typeof transactionNsu !== "string" ||
    transactionNsu.length < 3 ||
    transactionNsu.length > 160 ||
    typeof slug !== "string" ||
    slug.length < 1 ||
    slug.length > 160
  ) {
    return null;
  }
  return {
    eventId: `paid:${orderNsu}:${transactionNsu}`,
    orderNsu,
    transactionNsu,
    slug,
  };
}

// Used only while the server-side InfinitePay switch is off. Never a valid bank Pix payload.
export async function createPixCharge(input: {
  code: string;
  amountCents: number;
}): Promise<PixCharge> {
  return {
    provider: "demo",
    ref: `demo_${input.code}`,
    payload: `DEMONSTRATIVO-PIX|ARENA-LESTE|${input.code}|${(input.amountCents / 100).toFixed(2)}`,
    simulated: true,
  };
}
