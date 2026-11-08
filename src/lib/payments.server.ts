// Payments are deliberately simulation-only. No third-party PSP is called by this app.
// The Tournament form is a pre-registration and never charges money online.
export type PixCharge = { provider: string; ref: string; payload: string; simulated: boolean };

export interface PaymentProvider {
  name: string;
  createPix(input: { code: string; amountCents: number }): Promise<PixCharge>;
  /** The demo provider never confirms a payment from a webhook. */
  parseWebhook(
    req: Request,
  ): Promise<{ eventId: string; ref: string; status: "paid" | "failed" | "expired" } | null>;
}

const demoProvider: PaymentProvider = {
  name: "demo",
  async createPix({ code, amountCents }) {
    return {
      provider: "demo",
      ref: `demo_${code}`,
      payload: `DEMONSTRATIVO-PIX|ARENA-LESTE|${code}|${(amountCents / 100).toFixed(2)}`,
      simulated: true,
    };
  },
  async parseWebhook() {
    return null;
  },
};

// Intentionally fixed to demo mode: a leftover PSP token cannot enable real charges.
export function getProvider(): PaymentProvider {
  return demoProvider;
}

export const createPixCharge = (input: { code: string; amountCents: number }) =>
  demoProvider.createPix(input);
