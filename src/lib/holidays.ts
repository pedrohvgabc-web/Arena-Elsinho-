export type ArenaHolidayScope = "Nacional" | "Rondônia" | "Porto Velho";

export type ArenaHoliday = {
  date: string;
  name: string;
  scope: ArenaHolidayScope;
};

/**
 * Feriados legais recorrentes usados pelas unidades em Porto Velho.
 * Calendários administrativos anuais e pontos facultativos podem variar; o admin pode
 * cadastrar exceções adicionais por data.
 * Fontes de referência de 2026:
 * - https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026
 * - https://rondonia.ro.gov.br/decreto-do-governo-de-ro-define-feriados-estaduais-de-2026/
 * - https://www.portovelho.ro.gov.br/noticias/porto-velho-prefeitura-define-calendario-de-feriados-e-pontos-facultativos-de-2026
 */
export function arenaHolidaysForYear(year: number): ArenaHoliday[] {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return [];

  const holidays: ArenaHoliday[] = [
    { date: `${year}-01-01`, name: "Confraternização Universal", scope: "Nacional" },
    { date: `${year}-01-04`, name: "Instalação do Estado de Rondônia", scope: "Rondônia" },
    { date: `${year}-01-24`, name: "Instalação do Município de Porto Velho", scope: "Porto Velho" },
    { date: `${year}-04-21`, name: "Tiradentes", scope: "Nacional" },
    { date: `${year}-05-01`, name: "Dia Mundial do Trabalho", scope: "Nacional" },
    { date: `${year}-05-24`, name: "Nossa Senhora Auxiliadora", scope: "Porto Velho" },
    { date: `${year}-09-07`, name: "Independência do Brasil", scope: "Nacional" },
    { date: `${year}-10-02`, name: "Criação do Município de Porto Velho", scope: "Porto Velho" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", scope: "Nacional" },
    { date: `${year}-11-02`, name: "Finados", scope: "Nacional" },
    { date: `${year}-11-15`, name: "Proclamação da República", scope: "Nacional" },
    {
      date: `${year}-11-20`,
      name: "Dia Nacional de Zumbi e da Consciência Negra",
      scope: "Nacional",
    },
    { date: `${year}-12-25`, name: "Natal", scope: "Nacional" },
  ];

  holidays.push({
    date: offsetDate(easterSunday(year), -2),
    name: "Paixão de Cristo",
    scope: "Nacional",
  });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** Gregorian Easter calculation (Meeus/Jones/Butcher), returned as YYYY-MM-DD UTC. */
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function offsetDate(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
