import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInfinitePayCheckout,
  createPixCharge,
  getPaymentMode,
  parseInfinitePayWebhook,
  verifyInfinitePayPayment,
} from "./payments.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configureTestCheckout() {
  vi.stubEnv("INFINITEPAY_ENABLED", "true");
  vi.stubEnv("INFINITEPAY_API_KEY", "inchk_TEST_ONLY_0000000000000000");
  vi.stubEnv("INFINITEPAY_HANDLE", "pedro-henrique-veira");
}

describe("Pix demonstrativo do torneio", () => {
  it("retorna um payload claramente fictício e não chama provedor de cobrança", async () => {
    const charge = await createPixCharge({ code: "AL26-TESTE123", amountCents: 15000 });

    expect(charge.provider).toBe("demo");
    expect(charge.simulated).toBe(true);
    expect(charge.payload).toBe("DEMONSTRATIVO-PIX|ARENA-LESTE|AL26-TESTE123|150.00");
  });
});

describe("InfinitePay server checkout", () => {
  it("permanece desligado por padrão e não consulta a API", () => {
    vi.stubEnv("INFINITEPAY_ENABLED", "false");
    expect(getPaymentMode()).toBe("demo");
  });

  it("cria um link de pagamento em centavos com Pix e cartão, sem enviar CPF/endereço", async () => {
    configureTestCheckout();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ url: "https://checkout.infinitepay.io/pay/example" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const checkout = await createInfinitePayCheckout({
      orderNsu: "ALB-AL-TESTE12",
      amountCents: 10_000,
      description: "Reserva Arena Leste AL-TESTE12",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(checkout.checkoutUrl).toBe("https://checkout.infinitepay.io/pay/example");
    expect(checkout.simulated).toBe(false);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.checkout.infinitepay.io/links");
    expect(new Headers(init?.headers).get("X-Api-Key")).toBe("inchk_TEST_ONLY_0000000000000000");
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload["items"]).toEqual([
      { description: "Reserva Arena Leste AL-TESTE12", price: 10_000, quantity: 1 },
    ]);
    expect(payload["options"]).toMatchObject({
      single_payment: true,
      require_delivery_address: false,
      payment_methods_enabled: ["credit_card", "pix"],
    });
    expect(payload).not.toHaveProperty("customer");
    expect(payload).not.toHaveProperty("address");
  });

  it("confirma apenas uma resposta payment_check paga e com o amount exato", async () => {
    configureTestCheckout();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            paid: true,
            amount: 10_000,
            paid_amount: 10_250,
            capture_method: "credit_card",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const verified = await verifyInfinitePayPayment({
      orderNsu: "ALB-AL-TESTE12",
      transactionNsu: "txn-test-123",
      slug: "invoice-test",
      expectedAmountCents: 10_000,
    });
    expect(verified.valid).toBe(true);
    expect(verified.captureMethod).toBe("credit_card");
    expect(verified.amountCents).toBe(10_000);
  });

  it("rejeita pagamento aprovado cujo amount não corresponda ao valor do pedido", async () => {
    configureTestCheckout();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              paid: true,
              amount: 9_999,
              paid_amount: 10_249,
              capture_method: "pix",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    const verified = await verifyInfinitePayPayment({
      orderNsu: "ALB-AL-TESTE12",
      transactionNsu: "txn-test-456",
      slug: "invoice-test",
      expectedAmountCents: 10_000,
    });
    expect(verified.valid).toBe(false);
  });

  it("extrai somente identificadores do webhook para validar no servidor", async () => {
    const request = new Request("https://arena-leste.onrender.com/api/public/payments/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        order_nsu: "ALT-AL26-TESTE1234",
        transaction_nsu: "txn-test-123",
        invoice_slug: "invoice-test",
        amount: 15_000,
        items: [{ description: "teste" }],
      }),
    });
    const notice = await parseInfinitePayWebhook(request);
    expect(notice).toEqual({
      eventId: "paid:ALT-AL26-TESTE1234:txn-test-123",
      orderNsu: "ALT-AL26-TESTE1234",
      transactionNsu: "txn-test-123",
      slug: "invoice-test",
    });
  });
});
