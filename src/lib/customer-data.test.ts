import { describe, expect, it } from "vitest";
import { formatCpfInput, normalizeValidCpf } from "./customer-data";

describe("CPF de reserva", () => {
  it("normaliza CPF válido com ou sem máscara", () => {
    expect(normalizeValidCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizeValidCpf("52998224725")).toBe("52998224725");
  });

  it("rejeita dígitos verificadores incorretos e sequências repetidas", () => {
    expect(normalizeValidCpf("529.982.247-24")).toBeNull();
    expect(normalizeValidCpf("111.111.111-11")).toBeNull();
    expect(normalizeValidCpf("1234")).toBeNull();
  });

  it("formata a digitação progressivamente", () => {
    expect(formatCpfInput("52998224725")).toBe("529.982.247-25");
    expect(formatCpfInput("529982")).toBe("529.982");
    expect(formatCpfInput("529.982.247-25123")).toBe("529.982.247-25");
  });
});
