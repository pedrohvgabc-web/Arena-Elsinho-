import { describe, expect, it } from "vitest";
import { createPixCharge } from "./payments.server";

describe("Pix demonstrativo do torneio", () => {
  it("retorna um payload claramente fictício e não chama provedor de cobrança", async () => {
    const charge = await createPixCharge({ code: "AL26-TESTE123", amountCents: 15000 });

    expect(charge.provider).toBe("demo");
    expect(charge.simulated).toBe(true);
    expect(charge.payload).toBe("DEMONSTRATIVO-PIX|ARENA-LESTE|AL26-TESTE123|150.00");
  });
});
