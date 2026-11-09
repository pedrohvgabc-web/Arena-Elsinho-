import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Clock3, Copy, Loader2, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SITE } from "@/lib/site";
import {
  adminArenaSettings,
  adminCopyArenaHours,
  adminUpdateArenaHours,
  adminUpdateArenaSpace,
} from "@/lib/arena.functions";
import type { OpeningWindow } from "@/lib/arena-rules";

type UnitId = "unidade-1" | "unidade-2";
type Space = {
  id: string;
  unitId: UnitId;
  name: string;
  sport: string;
  slotMinutes: number;
  priceCents: number | null;
  active: boolean;
  sortOrder: number;
};
type Schedule = { unitId: UnitId; weekday: number; windows: OpeningWindow[] };
type SpaceDraft = { name: string; priceText: string; slotMinutes: number; active: boolean };
type DraftHours = Record<UnitId, Record<number, OpeningWindow[]>>;

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const UNIT_IDS: UnitId[] = ["unidade-1", "unidade-2"];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

function centsFromText(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function initialHours(schedules: Schedule[] | undefined): DraftHours {
  const result: DraftHours = { "unidade-1": {}, "unidade-2": {} };
  for (const unitId of UNIT_IDS) {
    for (const weekday of WEEKDAYS.keys()) {
      result[unitId][weekday] =
        schedules?.find((entry) => entry.unitId === unitId && entry.weekday === weekday)?.windows ??
        [];
    }
  }
  return result;
}

export function ArenaSettingsAdmin({
  initialTab = "courts",
  showTabs = true,
}: {
  initialTab?: "courts" | "hours";
  showTabs?: boolean;
}) {
  const fetchSettings = useServerFn(adminArenaSettings);
  const copyHours = useServerFn(adminCopyArenaHours);
  const saveSpace = useServerFn(adminUpdateArenaSpace);
  const saveHours = useServerFn(adminUpdateArenaHours);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"courts" | "hours">(initialTab);
  const [selectedUnit, setSelectedUnit] = useState<UnitId>("unidade-1");
  const [spaceDrafts, setSpaceDrafts] = useState<Record<string, SpaceDraft>>({});
  const [hoursDraft, setHoursDraft] = useState<DraftHours>({ "unidade-1": {}, "unidade-2": {} });
  const [savingSpaceId, setSavingSpaceId] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [copyingHours, setCopyingHours] = useState(false);

  const query = useQuery({
    queryKey: ["admin-arena-settings"],
    queryFn: () => fetchSettings(),
    retry: false,
  });

  useEffect(() => {
    if (!query.data) return;
    setSpaceDrafts(
      Object.fromEntries(
        query.data.spaces.map((space) => [
          space.id,
          {
            name: space.name,
            priceText: space.priceCents === null ? "" : (space.priceCents / 100).toFixed(2),
            slotMinutes: space.slotMinutes,
            active: space.active,
          },
        ]),
      ),
    );
    setHoursDraft(initialHours(query.data.hours as Schedule[]));
  }, [query.data]);

  function updateSpace(id: string, patch: Partial<SpaceDraft>) {
    setSpaceDrafts((current) => ({ ...current, [id]: { ...current[id]!, ...patch } }));
  }

  function updateWindows(weekday: number, windows: OpeningWindow[]) {
    setHoursDraft((current) => ({
      ...current,
      [selectedUnit]: { ...current[selectedUnit], [weekday]: windows },
    }));
  }

  async function saveSpaceChanges(space: Space) {
    const draft = spaceDrafts[space.id];
    if (!draft) return;
    const priceCents = centsFromText(draft.priceText);
    if (draft.active && priceCents === null) {
      toast.error("Informe um preço maior que zero antes de ativar a quadra.");
      return;
    }
    setSavingSpaceId(space.id);
    try {
      const result = await saveSpace({
        data: {
          id: space.id,
          name: draft.name.trim(),
          priceCents,
          slotMinutes: draft.slotMinutes,
          active: draft.active,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${draft.name} atualizada.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-day"] });
    } catch {
      toast.error("Não foi possível salvar a quadra.");
    } finally {
      setSavingSpaceId(null);
    }
  }

  async function saveDay(weekday: number) {
    const key = `${selectedUnit}:${weekday}`;
    setSavingDay(key);
    try {
      const result = await saveHours({
        data: {
          unitId: selectedUnit,
          weekday,
          windows: hoursDraft[selectedUnit][weekday] ?? [],
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Horários de ${WEEKDAYS[weekday]?.toLowerCase()} salvos.`);
    } catch {
      toast.error("Não foi possível salvar os horários.");
    } finally {
      setSavingDay(null);
    }
  }

  async function copyWeekToOtherUnit() {
    const targetUnitId: UnitId = selectedUnit === "unidade-1" ? "unidade-2" : "unidade-1";
    const sourceLabel = selectedUnit === "unidade-1" ? "Unidade 1" : "Unidade 2";
    const targetLabel = targetUnitId === "unidade-1" ? "Unidade 1" : "Unidade 2";
    if (
      !window.confirm(
        `Copiar a grade semanal de ${sourceLabel} para ${targetLabel}? Os sete dias da unidade de destino serão substituídos. Reservas existentes não serão alteradas.`,
      )
    )
      return;

    const days = WEEKDAYS.map((_, weekday) => ({
      weekday,
      windows: (hoursDraft[selectedUnit][weekday] ?? []).map((window) => ({ ...window })),
    }));
    setCopyingHours(true);
    try {
      const result = await copyHours({
        data: { sourceUnitId: selectedUnit, targetUnitId, days },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const cloned = Object.fromEntries(
        days.map(({ weekday, windows }) => [weekday, windows.map((window) => ({ ...window }))]),
      );
      setHoursDraft((current) => ({ ...current, [targetUnitId]: cloned }));
      toast.success(`Grade copiada para ${targetLabel}.`);
    } catch {
      toast.error("Não foi possível copiar a grade semanal.");
    } finally {
      setCopyingHours(false);
    }
  }

  const spaces = (query.data?.spaces ?? []) as Space[];
  const unitName = SITE.units.find((unit) => unit.id === selectedUnit)?.name ?? "Unidade";

  return (
    <section
      className="mt-8 overflow-hidden rounded-3xl border border-border bg-card/50"
      aria-labelledby="arena-settings-heading"
    >
      <div className="border-b border-border bg-card/70 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Settings2 className="h-4 w-4" /> Operação da Arena
            </p>
            <h2
              id="arena-settings-heading"
              className="mt-1 font-display text-3xl font-bold uppercase"
            >
              {tab === "courts" ? "Unidades e quadras" : "Horários de funcionamento"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Configure os valores e a grade real de cada unidade antes de liberar a reserva online.
              Quadras sem preço salvo não aparecem para o público.
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary">
            <Check className="h-3.5 w-3.5" /> Somente admin
          </span>
        </div>
        {showTabs && (
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Configurações da Arena"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "courts"}
              onClick={() => setTab("courts")}
              className={`min-h-11 rounded-full px-5 text-sm font-bold transition-colors ${tab === "courts" ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50"}`}
            >
              Quadras e valores
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "hours"}
              onClick={() => setTab("hours")}
              className={`min-h-11 rounded-full px-5 text-sm font-bold transition-colors ${tab === "hours" ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50"}`}
            >
              Grade semanal
            </button>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <p className="flex items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando configurações…
        </p>
      ) : query.isError ? (
        <p className="m-5 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-warning">
          Não foi possível carregar a configuração de quadras. Confirme se a migração de unidades e
          horários foi aplicada ao Neon.
        </p>
      ) : tab === "courts" ? (
        <div className="p-5 sm:p-7" role="tabpanel">
          <div className="mb-5 flex flex-wrap gap-2" aria-label="Unidade para editar">
            {UNIT_IDS.map((unitId, index) => (
              <button
                key={unitId}
                type="button"
                onClick={() => setSelectedUnit(unitId)}
                aria-pressed={selectedUnit === unitId}
                className={`min-h-11 rounded-full px-4 text-sm font-bold ${selectedUnit === unitId ? "bg-secondary text-secondary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
              >
                Unidade {index + 1}
              </button>
            ))}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {unitName} · vôlei de praia · preço por horário
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {spaces
              .filter((space) => space.unitId === selectedUnit)
              .map((space) => {
                const draft = spaceDrafts[space.id];
                if (!draft) return null;
                return (
                  <article
                    key={space.id}
                    className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                          Quadra {space.sortOrder % 100}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {space.sport} · {draft.slotMinutes} min
                        </p>
                      </div>
                      <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(event) =>
                            updateSpace(space.id, { active: event.target.checked })
                          }
                          className="h-4 w-4 accent-orange-500"
                        />
                        Ativa para reserva
                      </label>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.9fr_0.75fr]">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Nome da quadra
                        <input
                          value={draft.name}
                          onChange={(event) => updateSpace(space.id, { name: event.target.value })}
                          maxLength={80}
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground"
                        />
                      </label>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Valor (R$)
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          inputMode="decimal"
                          value={draft.priceText}
                          onChange={(event) =>
                            updateSpace(space.id, { priceText: event.target.value })
                          }
                          placeholder="Ex.: 100,00"
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground"
                        />
                      </label>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Duração
                        <select
                          value={draft.slotMinutes}
                          onChange={(event) =>
                            updateSpace(space.id, { slotMinutes: Number(event.target.value) })
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground"
                        >
                          {DURATION_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {minutes} min
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={savingSpaceId === space.id || !draft.name.trim()}
                      onClick={() => saveSpaceChanges(space)}
                      className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingSpaceId === space.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar quadra
                    </button>
                  </article>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-7" role="tabpanel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-bold uppercase">Funcionamento semanal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Defina até dois intervalos de abertura por dia. Deixe sem intervalos para marcar a
                unidade fechada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2" aria-label="Unidade para editar">
                {UNIT_IDS.map((unitId, index) => (
                  <button
                    key={unitId}
                    type="button"
                    onClick={() => setSelectedUnit(unitId)}
                    aria-pressed={selectedUnit === unitId}
                    className={`min-h-11 rounded-full px-4 text-sm font-bold ${selectedUnit === unitId ? "bg-secondary text-secondary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    Unidade {index + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={copyingHours}
                onClick={() => void copyWeekToOtherUnit()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {copyingHours ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copiar para outra unidade
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm font-semibold text-foreground">{unitName}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {WEEKDAYS.map((day, weekday) => {
              const windows = hoursDraft[selectedUnit][weekday] ?? [];
              const saving = savingDay === `${selectedUnit}:${weekday}`;
              return (
                <article
                  key={day}
                  className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      <h4 className="font-bold">{day}</h4>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${windows.length ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {windows.length ? "Aberta" : "Fechada"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {windows.map((window, index) => (
                      <div
                        key={`${day}-${index}`}
                        className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2"
                      >
                        <label className="text-xs font-semibold text-muted-foreground">
                          Abre
                          <input
                            type="time"
                            step="900"
                            value={window.start}
                            onChange={(event) =>
                              updateWindows(
                                weekday,
                                windows.map((item, i) =>
                                  i === index ? { ...item, start: event.target.value } : item,
                                ),
                              )
                            }
                            className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground"
                          />
                        </label>
                        <span className="pb-3 text-muted-foreground">—</span>
                        <label className="text-xs font-semibold text-muted-foreground">
                          Fecha
                          <input
                            type="time"
                            step="900"
                            value={window.end}
                            onChange={(event) =>
                              updateWindows(
                                weekday,
                                windows.map((item, i) =>
                                  i === index ? { ...item, end: event.target.value } : item,
                                ),
                              )
                            }
                            className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateWindows(
                              weekday,
                              windows.filter((_, i) => i !== index),
                            )
                          }
                          aria-label={`Remover intervalo de ${day}`}
                          className="mb-0.5 grid h-11 w-11 place-items-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {windows.length < 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateWindows(weekday, [
                            ...windows,
                            {
                              start: windows.length ? "14:00" : "17:00",
                              end: windows.length ? "23:00" : "23:00",
                            },
                          ])
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-4 w-4" /> Adicionar intervalo
                      </button>
                    )}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveDay(weekday)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar este dia
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
