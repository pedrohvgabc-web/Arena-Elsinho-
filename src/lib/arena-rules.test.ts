import { describe, it, expect } from "vitest";
import { validateSlot, slotsFor, normalizePhone } from "./arena-rules";

// 2026-10-24 is a Saturday. "now" = Fri 2026-10-23 12:00 Cuiabá (16:00 UTC)
const NOW = new Date("2026-10-23T16:00:00Z");

describe("regras de funcionamento", () => {
  it("bloqueia domingo", () => expect(validateSlot("2026-10-25", "10:00", NOW).ok).toBe(false));
  it("bloqueia data passada", () => expect(validateSlot("2026-10-20", "10:00", NOW).ok).toBe(false));
  it("segunda abre 09:00 e último horário 17:00", () => {
    const s = slotsFor("2026-10-26");
    expect(s[0]!.start).toBe("09:00");
    expect(s.at(-1)!.start).toBe("17:00");
  });
  it("segunda 08:00 é fora do expediente", () => expect(validateSlot("2026-10-26", "08:00", NOW).ok).toBe(false));
  it("terça bloqueia almoço 12:00-14:00", () => {
    expect(validateSlot("2026-10-27", "12:00", NOW).ok).toBe(false);
    expect(validateSlot("2026-10-27", "13:00", NOW).ok).toBe(false);
    expect(validateSlot("2026-10-27", "14:00", NOW).ok).toBe(true);
  });
  it("sábado último horário 23:00 termina 23:59", () => {
    const r = validateSlot("2026-10-24", "23:00", NOW);
    expect(r).toEqual({ ok: true, end: "23:59" });
  });
  it("hoje com horário já passado é bloqueado", () => expect(validateSlot("2026-10-23", "10:00", NOW).ok).toBe(false));
  it("horário inválido", () => expect(validateSlot("2026-10-27", "14:30", NOW).ok).toBe(false));
});

describe("telefone", () => {
  it("aceita celular com DDD", () => expect(normalizePhone("(65) 99999-1234")).toBe("65999991234"));
  it("aceita com +55", () => expect(normalizePhone("+55 65 99999-1234")).toBe("65999991234"));
  it("rejeita curto", () => expect(normalizePhone("1234")).toBeNull());
});
