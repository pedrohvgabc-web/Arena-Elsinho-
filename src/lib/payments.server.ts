// Payment provider abstraction. Without a configured PSP, runs in demo mode:
// the Pix payload is simulated and NEVER marks a booking as paid.
// With MERCADOPAGO_ACCESS_TOKEN set, real Pix charges (QR + copia-e-cola) are created
// and the webhook confirms payment automatically after re-fetching the payment from the API.
export type PixCharge = { provider: string; ref: string; payload: string; simulated: boolean };

export interface PaymentProvider {
  name: string;
  createPix(input: { code: string; amountCents: number }): Promise<PixCharge>;
  /** Verify the webhook and return a normalized event, or null when invalid. */
  parseWebhook(req: Request): Promise<{ eventId: string; ref: string; status: "paid" | "failed" | "expired" } | null>;
}

const demoProvider: PaymentProvider = {
  name: "demo",
  async createPix({ code, amountCents }) {
    return {
      provider: "demo",
      ref: `demo_${code}`,
      payload: `DEMONSTRATIVO-PIX|ARENA-ELSINHO|${code}|${(amountCents / 100).toFixed(2)}`,
      simulated: true,
    };
  },
  async parseWebhook() {
    return null; // demo never confirms payments
  },
};

const MP = "https://api.mercadopago.com/v1/payments";

function mercadoPago(token: string): PaymentProvider {
  return {
    name: "mercadopago",
    async createPix({ code, amountCents }) {
      const res = await fetch(MP, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": code },
        body: JSON.stringify({
          transaction_amount: amountCents / 100,
          description: `Reserva ${code} - Arena Elsinho`,
          payment_method_id: "pix",
          external_reference: code,
          date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("Z", "-00:00"),
          payer: { email: `reserva+${code.toLowerCase()}@arenaelsinho.com.br` },
        }),
      });
      const j = (await res.json()) as { id?: number; point_of_interaction?: { transaction_data?: { qr_code?: string } } };
      const qr = j.point_of_interaction?.transaction_data?.qr_code;
      if (!res.ok || !j.id || !qr) {
        console.error("mercadopago pix failed", res.status);
        return demoProvider.createPix({ code, amountCents });
      }
      return { provider: "mercadopago", ref: String(j.id), payload: qr, simulated: false };
    },
    async parseWebhook(req) {
      // Never trust the body: re-fetch the payment from Mercado Pago with our token.
      const url = new URL(req.url);
      const body = (await req.json().catch(() => ({}))) as { data?: { id?: string | number } };
      const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
      if (!/^\d{1,20}$/.test(id)) return null;
      const res = await fetch(`${MP}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const p = (await res.json()) as { status?: string };
      const status = p.status === "approved" ? "paid" : p.status === "cancelled" || p.status === "expired" ? "expired" : p.status === "rejected" ? "failed" : null;
      if (!status) return null;
      return { eventId: `${id}:${status}`, ref: id, status };
    },
  };
}

export function getProvider(): PaymentProvider {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  return token ? mercadoPago(token) : demoProvider;
}

export const createPixCharge = (i: { code: string; amountCents: number }) => getProvider().createPix(i);
