import { describe, expect, it } from "vitest";
import { arenaHolidaysForYear } from "./holidays";

describe("feriados recorrentes de Porto Velho/RO", () => {
  it("reconhece feriados nacionais, o estadual e os municipais em 2026", () => {
    const holidays = arenaHolidaysForYear(2026);
    expect(holidays).toHaveLength(14);
    expect(holidays).toContainEqual({
      date: "2026-01-04",
      name: "Instalação do Estado de Rondônia",
      scope: "Rondônia",
    });
    expect(holidays).toContainEqual({
      date: "2026-01-24",
      name: "Instalação do Município de Porto Velho",
      scope: "Porto Velho",
    });
    expect(holidays).toContainEqual({
      date: "2026-04-03",
      name: "Paixão de Cristo",
      scope: "Nacional",
    });
    expect(holidays.map(({ date }) => date)).toEqual([...holidays.map(({ date }) => date)].sort());
  });

  it("calcula corretamente a Paixão de Cristo em ano bissexto ou comum", () => {
    expect(arenaHolidaysForYear(2024).find(({ name }) => name === "Paixão de Cristo")?.date).toBe(
      "2024-03-29",
    );
    expect(arenaHolidaysForYear(2027).find(({ name }) => name === "Paixão de Cristo")?.date).toBe(
      "2027-03-26",
    );
  });
});
