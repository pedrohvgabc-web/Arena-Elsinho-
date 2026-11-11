import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminDeleteArenaDateOverride,
  adminGetArenaDateOverrides,
  adminSaveArenaDateOverride,
} from "@/lib/arena.functions";
import { arenaHolidaysForYear, type ArenaHolidayScope } from "@/lib/holidays";
import { arenaNow, validateOpeningWindows, weekdayOf, type OpeningWindow } from "@/lib/arena-rules";

type UnitId = "unidade-1" | "unidade-2";
type DateOverride = { unitId: UnitId; date: string; label: string; windows: OpeningWindow[] };
type HolidayItem = { date: string; name: string; scope: ArenaHolidayScope | "Data especial" };

const WEEKEND_WINDOWS: OpeningWindow[] = [{ start: "08:00", end: "23:00" }];
const WEEKDAY_WINDOWS: OpeningWindow[] = [{ start: "19:00", end: "24:00" }];

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function defaultWindows(date: string, weeklyHours: Record<number, OpeningWindow[]>) {
  const weekday = weekdayOf(date);
  const current = weeklyHours[weekday] ?? [];
  return current.length
    ? current.map((window) => ({ ...window }))
    : (weekday === 0 || weekday === 6 ? WEEKEND_WINDOWS : WEEKDAY_WINDOWS).map((window) => ({
        ...window,
      }));
}

export function ArenaHolidayHoursAdmin({
  unitId,
  weeklyHours,
}: {
  unitId: UnitId;
  weeklyHours: Record<number, OpeningWindow[]>;
}) {
  const currentYear = Number(arenaNow().date.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftWindows, setDraftWindows] = useState<OpeningWindow[]>([]);
  const [closed, setClosed] = useState(false);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(`${currentYear}-12-24`);
  const [customLabel, setCustomLabel] = useState("");

  const getOverrides = useServerFn(adminGetArenaDateOverrides);
  const saveOverride = useServerFn(adminSaveArenaDateOverride);
  const deleteOverride = useServerFn(adminDeleteArenaDateOverride);
  const queryClient = useQueryClient();
  const overridesQuery = useQuery({
    queryKey: ["admin-arena-date-overrides", unitId, year],
    queryFn: () => getOverrides({ data: { year } }),
    retry: false,
  });

  const holidays: HolidayItem[] = arenaHolidaysForYear(year);
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const overrides = (overridesQuery.data ?? []).filter((item) => item.unitId === unitId);
  const customOverrides: HolidayItem[] = overrides
    .filter((item) => !holidayDates.has(item.date))
    .map((item) => ({ date: item.date, name: item.label, scope: "Data especial" }));
  const items = [...holidays, ...customOverrides];
  if (editingDate && !items.some((item) => item.date === editingDate)) {
    items.push({ date: editingDate, name: draftLabel || "Data especial", scope: "Data especial" });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  const overrideByDate = new Map(overrides.map((item) => [item.date, item]));

  function beginEdit(item: HolidayItem) {
    const existing = overrideByDate.get(item.date);
    setEditingDate(item.date);
    setDraftLabel(existing?.label ?? item.name);
    setDraftWindows(
      existing
        ? existing.windows.map((window) => ({ ...window }))
        : defaultWindows(item.date, weeklyHours),
    );
    setClosed(Boolean(existing && existing.windows.length === 0));
  }

  function beginCustomDate() {
    if (!customDate || !customLabel.trim()) {
      toast.error("Informe a data e o nome da data especial.");
      return;
    }
    beginEdit({ date: customDate, name: customLabel.trim(), scope: "Data especial" });
  }

  async function refreshAvailability() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-arena-date-overrides", unitId, year] }),
      queryClient.invalidateQueries({ queryKey: ["booking-dates", unitId] }),
      queryClient.invalidateQueries({ queryKey: ["booking-availability"] }),
    ]);
  }

  async function saveDate(item: HolidayItem) {
    if (!draftLabel.trim()) {
      toast.error("Informe o nome do feriado ou da data especial.");
      return;
    }
    const windows = closed ? [] : draftWindows;
    const validationError = validateOpeningWindows(windows);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSavingDate(item.date);
    try {
      const result = await saveOverride({
        data: { unitId, date: item.date, label: draftLabel.trim(), windows },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Exceção de ${dateLabel(item.date)} salva.`);
      setEditingDate(null);
      await refreshAvailability();
    } catch {
      toast.error("Não foi possível salvar a exceção de horário.");
    } finally {
      setSavingDate(null);
    }
  }

  async function resetDate(date: string) {
    setSavingDate(date);
    try {
      const result = await deleteOverride({ data: { unitId, date } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("A data voltou a seguir a grade semanal.");
      await refreshAvailability();
    } catch {
      toast.error("Não foi possível remover a exceção.");
    } finally {
      setSavingDate(null);
    }
  }

  function updateWindow(index: number, patch: Partial<OpeningWindow>) {
    setDraftWindows((current) =>
      current.map((window, position) => (position === index ? { ...window, ...patch } : window)),
    );
  }

  return (
    <section className="mt-9 border-t border-border pt-7" aria-labelledby="holiday-hours-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CalendarDays className="h-4 w-4" /> Calendário da Arena
          </p>
          <h3 id="holiday-hours-heading" className="mt-1 font-display text-2xl font-bold uppercase">
            Feriados e datas especiais
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Feriados nacionais, estadual de Rondônia e municipais de Porto Velho são reconhecidos
            automaticamente. Sem exceção salva, vale a grade semanal. Ponto facultativo não fecha a
            Arena automaticamente; use uma data especial para definir o expediente.
          </p>
        </div>
        <label className="text-xs font-semibold text-muted-foreground">
          Ano
          <select
            value={year}
            onChange={(event) => {
              const nextYear = Number(event.target.value);
              setYear(nextYear);
              setEditingDate(null);
              setCustomDate(`${nextYear}-12-24`);
            }}
            className="mt-1 block h-11 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground"
          >
            {Array.from({ length: 5 }, (_, index) => currentYear + index).map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Adicionar outra data especial</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[0.7fr_1fr_auto]">
          <label className="text-xs font-semibold text-muted-foreground">
            Data
            <input
              type="date"
              value={customDate}
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              onChange={(event) => setCustomDate(event.target.value)}
              className="mt-1 block h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Nome
            <input
              value={customLabel}
              maxLength={120}
              onChange={(event) => setCustomLabel(event.target.value)}
              placeholder="Ex.: ponto facultativo ou evento"
              className="mt-1 block h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={beginCustomDate}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" /> Configurar data
          </button>
        </div>
      </div>

      {overridesQuery.isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando calendário…
        </p>
      ) : overridesQuery.isError ? (
        <p className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Não foi possível carregar as exceções. Confirme se a migração de datas especiais foi
          aplicada.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const override = overrideByDate.get(item.date);
            const isEditing = editingDate === item.date;
            const busy = savingDate === item.date;
            const status = !override
              ? "Segue a grade semanal"
              : override.windows.length === 0
                ? "Fechada nesta data"
                : `Horário especial: ${override.windows.map((window) => `${window.start}–${window.end === "24:00" ? "00:00" : window.end}`).join(" · ")}`;

            return (
              <article
                key={item.date}
                className="rounded-2xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {item.scope} · {dateLabel(item.date)}
                    </p>
                    <h4 className="mt-1 font-bold">{item.name}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => beginEdit(item)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Clock3 className="h-4 w-4" />{" "}
                      {override ? "Editar exceção" : "Definir horário"}
                    </button>
                    {override && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resetDate(item.date)}
                        aria-label={`Voltar à grade semanal em ${item.name}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-3 text-sm text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Usar grade semanal
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Nome da data
                      <input
                        value={draftLabel}
                        maxLength={120}
                        onChange={(event) => setDraftLabel(event.target.value)}
                        className="mt-1 block h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={closed}
                        onChange={(event) => setClosed(event.target.checked)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      Fechar nesta data
                    </label>

                    {!closed && (
                      <div className="mt-3 space-y-2">
                        {draftWindows.map((window, index) => (
                          <div
                            key={`${item.date}-${index}`}
                            className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2"
                          >
                            <label className="text-xs font-semibold text-muted-foreground">
                              Abre
                              <input
                                type="time"
                                step="900"
                                value={window.start}
                                onChange={(event) =>
                                  updateWindow(index, { start: event.target.value })
                                }
                                className="mt-1 block h-11 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                              />
                            </label>
                            <span className="pb-3 text-muted-foreground">—</span>
                            <label className="text-xs font-semibold text-muted-foreground">
                              Fecha
                              <input
                                type="time"
                                step="900"
                                value={window.end === "24:00" ? "00:00" : window.end}
                                onChange={(event) =>
                                  updateWindow(index, {
                                    end:
                                      event.target.value === "00:00" ? "24:00" : event.target.value,
                                  })
                                }
                                className="mt-1 block h-11 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={draftWindows.length === 1}
                              onClick={() =>
                                setDraftWindows((current) => current.filter((_, i) => i !== index))
                              }
                              aria-label={`Remover intervalo de ${item.name}`}
                              className="mb-0.5 grid h-11 w-11 place-items-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          Se o fechamento for à meia-noite, selecione 00:00. O último horário poderá
                          terminar às 00:00 do dia seguinte.
                        </p>
                        {draftWindows.length < 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftWindows((current) => [
                                ...current,
                                { start: "08:00", end: "12:00" },
                              ])
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                          >
                            <Plus className="h-4 w-4" /> Adicionar intervalo
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveDate(item)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar exceção
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDate(null)}
                        className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {items.length === 0 && (
            <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
              Nenhum feriado encontrado para este ano.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
