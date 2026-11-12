import { describe, it, expect } from "vitest";
import {
  calculateBookingPrice,
  formatDuration,
  initialPaymentCents,
  paymentProgressPercentages,
  splitAmountCents,
  verifiedPaymentAmountCents,
  validateSlot,
  slotsFor,
  normalizePhone,
  suggestOpeningWindow,
  validateOpeningWindows,
  type OpeningWindow,
} from "./arena-rules";

// 2026-10-24 é sábado. Agora = sexta-feira, 23/10/2026, 09:00 em Porto Velho.
const NOW = new Date("2026-10-23T13:00:00Z");
const SATURDAY: OpeningWindow[] = [{ start: "17:00", end: "23:00" }];
const TUESDAY: OpeningWindow[] = [
  { start: "08:00", end: "12:00" },
  { start: "14:00", end: "22:00" },
];

describe("regras de funcionamento configuráveis", () => {
  it("sugere um segundo intervalo válido, sem sobrepor o padrão 17h–23h", () => {
    const suggestion = suggestOpeningWindow([{ start: "17:00", end: "23:00" }]);
    expect(suggestion).toEqual({ start: "08:00", end: "12:00" });
    expect(validateOpeningWindows([{ start: "17:00", end: "23:00" }, suggestion!])).toBeNull();
  });
  it("rejeita intervalos sobrepostos antes de salvar", () => {
    expect(
      validateOpeningWindows([
        { start: "14:00", end: "23:00" },
        { start: "17:00", end: "23:00" },
      ]),
    ).toBe("Os intervalos não podem se sobrepor.");
  });
  it("aceita 24:00 apenas como fechamento e inclui o último slot até meia-noite", () => {
    const overnight: OpeningWindow[] = [{ start: "19:00", end: "24:00" }];
    expect(validateOpeningWindows(overnight)).toBeNull();
    expect(slotsFor("2026-10-23", overnight).at(-1)).toEqual({ start: "23:00", end: "24:00" });
    expect(validateSlot("2026-10-23", "23:00", overnight, 60, NOW)).toEqual({
      ok: true,
      end: "24:00",
    });
    expect(validateOpeningWindows([{ start: "19:00", end: "24:15" }])).toBe(
      "Informe horários de abertura e fechamento válidos.",
    );
  });
  it("não sugere uma segunda janela se não houver um espaço de uma hora", () => {
    expect(suggestOpeningWindow([{ start: "08:00", end: "23:00" }])).toBeNull();
  });
  it("não gera slots para uma unidade fechada", () =>
    expect(slotsFor("2026-10-25", []).length).toBe(0));
  it("bloqueia data passada", () =>
    expect(validateSlot("2026-10-20", "10:00", TUESDAY, 60, NOW).ok).toBe(false));
  it("gera slots completos dentro da grade semanal", () => {
    const slots = slotsFor("2026-10-24", SATURDAY);
    expect(slots[0]).toEqual({ start: "17:00", end: "18:00" });
    expect(slots.at(-1)).toEqual({ start: "22:00", end: "23:00" });
  });
  it("não inclui horário fora da grade configurada", () => {
    expect(validateSlot("2026-10-24", "16:00", SATURDAY, 60, NOW).ok).toBe(false);
  });
  it("respeita intervalo entre janelas de abertura", () => {
    expect(validateSlot("2026-10-27", "12:00", TUESDAY, 60, NOW).ok).toBe(false);
    expect(validateSlot("2026-10-27", "13:00", TUESDAY, 60, NOW).ok).toBe(false);
    expect(validateSlot("2026-10-27", "14:00", TUESDAY, 60, NOW).ok).toBe(true);
  });
  it("impede início de slot que ultrapassa o fechamento", () => {
    expect(validateSlot("2026-10-24", "22:30", SATURDAY, 60, NOW).ok).toBe(false);
  });
  it("bloqueia horário de hoje que já passou", () => {
    expect(
      validateSlot("2026-10-23", "08:00", [{ start: "07:00", end: "12:00" }], 60, NOW).ok,
    ).toBe(false);
  });
  it("rejeita data inexistente e horário inválido", () => {
    expect(validateSlot("2026-02-30", "14:00", TUESDAY, 60, NOW).ok).toBe(false);
    expect(validateSlot("2026-10-27", "24:00", TUESDAY, 60, NOW).ok).toBe(false);
  });
});

describe("preço promocional de reservas múltiplas", () => {
  it("mantém o preço normal com um horário e aplica R$50/h com dois", () => {
    expect(calculateBookingPrice(6_000, 60, 1)).toEqual({
      perSlotCents: 6_000,
      totalCents: 6_000,
      promoApplied: false,
    });
    expect(calculateBookingPrice(6_000, 60, 2)).toEqual({
      perSlotCents: 5_000,
      totalCents: 10_000,
      promoApplied: true,
    });
  });

  it("calcula o valor por hora proporcional à duração do horário", () => {
    expect(calculateBookingPrice(9_000, 90, 2)).toEqual({
      perSlotCents: 7_500,
      totalCents: 15_000,
      promoApplied: true,
    });
  });

  it("não dá desconto a dois slots de 30 min que somam exatamente uma hora", () => {
    expect(calculateBookingPrice(3_000, 30, 2)).toEqual({
      perSlotCents: 3_000,
      totalCents: 6_000,
      promoApplied: false,
    });
  });

  it("aplica R$50/h depois de passar uma hora, mesmo em um único slot de 90 min", () => {
    expect(calculateBookingPrice(9_000, 90, 1)).toEqual({
      perSlotCents: 7_500,
      totalCents: 7_500,
      promoApplied: true,
    });
    expect(calculateBookingPrice(3_000, 30, 3)).toEqual({
      perSlotCents: 2_500,
      totalCents: 7_500,
      promoApplied: true,
    });
  });

  it("não eleva uma tarifa configurada abaixo de R$50/h", () => {
    expect(calculateBookingPrice(4_000, 60, 2)).toEqual({
      perSlotCents: 4_000,
      totalCents: 8_000,
      promoApplied: false,
    });
  });
  it("totaliza quatro horas em R$200 e permite a jornada de 16 horas", () => {
    expect(calculateBookingPrice(6_000, 60, 4)).toEqual({
      perSlotCents: 5_000,
      totalCents: 20_000,
      promoApplied: true,
    });
    expect(calculateBookingPrice(6_000, 60, 16).totalCents).toBe(80_000);
  });
  it("calcula 30% em centavos e distribui o total sem perder centavos", () => {
    expect(initialPaymentCents(20_000, "deposit_30")).toBe(6_000);
    expect(initialPaymentCents(20_001, "deposit_30")).toBe(6_000);
    expect(initialPaymentCents(20_000, "full")).toBe(20_000);
    expect(splitAmountCents(6_001, 4)).toEqual([1_501, 1_500, 1_500, 1_500]);
    expect(splitAmountCents(20_000, 4).reduce((sum, value) => sum + value, 0)).toBe(20_000);
  });

  it("mostra 70% pendente após validar a entrada de 30% e saldo zero no pagamento integral", () => {
    expect(paymentProgressPercentages(20_000, 6_000)).toEqual({
      receivedCents: 6_000,
      remainingCents: 14_000,
      receivedPercentage: 30,
      remainingPercentage: 70,
    });
    expect(paymentProgressPercentages(20_000, 20_000)).toEqual({
      receivedCents: 20_000,
      remainingCents: 0,
      receivedPercentage: 100,
      remainingPercentage: 0,
    });
  });

  it("formata duração real e só soma recebimentos verificados", () => {
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(
      verifiedPaymentAmountCents([
        {
          provider: "infinitepay",
          providerStatus: "paid",
          bookingStatus: "expired",
          amountCents: 6_000,
        },
        {
          provider: "infinitepay",
          providerStatus: "pending",
          bookingStatus: "paid",
          amountCents: 6_000,
        },
        {
          provider: "onsite",
          providerStatus: "pending",
          bookingStatus: "paid",
          amountCents: 2_000,
        },
        {
          provider: "demo",
          providerStatus: "paid",
          bookingStatus: "paid",
          amountCents: 9_000,
        },
      ]),
    ).toBe(8_000);
  });
});

describe("telefone", () => {
  it("aceita celular com DDD", () => expect(normalizePhone("(69) 99999-1234")).toBe("69999991234"));
  it("aceita com +55", () => expect(normalizePhone("+55 69 99999-1234")).toBe("69999991234"));
  it("rejeita curto", () => expect(normalizePhone("1234")).toBeNull());
});
