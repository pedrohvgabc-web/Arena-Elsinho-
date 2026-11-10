import { describe, it, expect } from "vitest";
import {
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

describe("telefone", () => {
  it("aceita celular com DDD", () => expect(normalizePhone("(69) 99999-1234")).toBe("69999991234"));
  it("aceita com +55", () => expect(normalizePhone("+55 69 99999-1234")).toBe("69999991234"));
  it("rejeita curto", () => expect(normalizePhone("1234")).toBeNull());
});
