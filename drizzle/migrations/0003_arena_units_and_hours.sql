-- Catálogo da Arena Leste: mudança aditiva; registros e reservas antigos permanecem intactos.
ALTER TABLE public.arena_spaces
  ADD COLUMN IF NOT EXISTS unit_id text;

ALTER TABLE public.arena_spaces
  ALTER COLUMN price_cents DROP NOT NULL,
  ALTER COLUMN capacity DROP NOT NULL;

CREATE INDEX IF NOT EXISTS arena_spaces_unit_idx
  ON public.arena_spaces (unit_id, sort_order);

CREATE TABLE IF NOT EXISTS public.arena_weekly_hours (
  unit_id text NOT NULL CHECK (unit_id IN ('unidade-1', 'unidade-2')),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  windows jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(windows) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, weekday)
);

INSERT INTO public.arena_spaces (id, name, sport, capacity, slot_minutes, price_cents, active, sort_order, unit_id)
VALUES
  ('al-u1-q1', 'Quadra 1', 'Vôlei de praia', NULL, 60, NULL, false, 101, 'unidade-1'),
  ('al-u1-q2', 'Quadra 2', 'Vôlei de praia', NULL, 60, NULL, false, 102, 'unidade-1'),
  ('al-u1-q3', 'Quadra 3', 'Vôlei de praia', NULL, 60, NULL, false, 103, 'unidade-1'),
  ('al-u1-q4', 'Quadra 4', 'Vôlei de praia', NULL, 60, NULL, false, 104, 'unidade-1'),
  ('al-u2-q1', 'Quadra 1', 'Vôlei de praia', NULL, 60, NULL, false, 201, 'unidade-2'),
  ('al-u2-q2', 'Quadra 2', 'Vôlei de praia', NULL, 60, NULL, false, 202, 'unidade-2'),
  ('al-u2-q3', 'Quadra 3', 'Vôlei de praia', NULL, 60, NULL, false, 203, 'unidade-2'),
  ('al-u2-q4', 'Quadra 4', 'Vôlei de praia', NULL, 60, NULL, false, 204, 'unidade-2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.arena_weekly_hours (unit_id, weekday, windows)
SELECT unit_id, weekday, '[]'::jsonb
FROM unnest(ARRAY['unidade-1', 'unidade-2']::text[]) AS units(unit_id)
CROSS JOIN generate_series(0, 6) AS days(weekday)
ON CONFLICT (unit_id, weekday) DO NOTHING;
