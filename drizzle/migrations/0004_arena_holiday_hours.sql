CREATE TABLE IF NOT EXISTS public.arena_date_overrides (
  unit_id text NOT NULL CHECK (unit_id IN ('unidade-1', 'unidade-2')),
  booking_date date NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  windows jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(windows) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, booking_date)
);

COMMENT ON TABLE public.arena_date_overrides IS
  'Exceções de funcionamento por data para feriados e datas especiais da Arena Leste.';

INSERT INTO public.arena_weekly_hours (unit_id, weekday, windows, updated_at)
SELECT units.unit_id, days.weekday,
  CASE WHEN days.weekday BETWEEN 1 AND 5
    THEN '[{"start":"19:00","end":"24:00"}]'::jsonb
    ELSE '[{"start":"08:00","end":"23:00"}]'::jsonb
  END,
  now()
FROM unnest(ARRAY['unidade-1', 'unidade-2']::text[]) AS units(unit_id)
CROSS JOIN generate_series(0, 6) AS days(weekday)
ON CONFLICT (unit_id, weekday) DO UPDATE
SET windows = EXCLUDED.windows, updated_at = now();
