CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_code text NOT NULL UNIQUE,
  submission_key uuid NOT NULL UNIQUE,
  captain_name text NOT NULL CHECK (char_length(btrim(captain_name)) BETWEEN 3 AND 80),
  captain_phone text NOT NULL CHECK (captain_phone ~ '^[0-9]{10,11}$'),
  team_name text NOT NULL DEFAULT '' CHECK (char_length(team_name) <= 80),
  athletes jsonb NOT NULL CHECK (
    CASE
      WHEN jsonb_typeof(athletes) = 'array'
        THEN jsonb_array_length(athletes) BETWEEN 3 AND 5
      ELSE false
    END
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_registrations_status_created_idx
  ON public.tournament_registrations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS tournament_registrations_created_idx
  ON public.tournament_registrations (created_at DESC);

COMMENT ON TABLE public.tournament_registrations IS
  'Private pre-registrations for Arena Leste Torneio Novembro Azul 2026. Access only through authenticated server functions.';

COMMENT ON COLUMN public.tournament_registrations.athletes IS
  'Array of 3–5 athlete names excluding the captain, giving 4–6 total.';

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tournament_registrations FROM PUBLIC;
