-- Fins de semana da Arena Leste: sábado (6) e domingo (0), 08:00 até 00:00.
UPDATE public.arena_weekly_hours
SET windows = '[{"start":"08:00","end":"24:00"}]'::jsonb,
    updated_at = now()
WHERE unit_id IN ('unidade-1', 'unidade-2')
  AND weekday IN (0, 6);
