-- Temporary, non-PII public notices for time slots released by an admin cancellation.
CREATE TABLE IF NOT EXISTS public.released_slot_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id text NOT NULL REFERENCES public.arena_spaces(id) ON DELETE RESTRICT,
  booking_date date NOT NULL,
  slots jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  claimed_at timestamptz,
  claimed_group_code text,
  CONSTRAINT released_slot_offers_slots_array_check
    CHECK (jsonb_typeof(slots) = 'array' AND jsonb_array_length(slots) BETWEEN 1 AND 32),
  CONSTRAINT released_slot_offers_claim_pair_check
    CHECK ((claimed_at IS NULL) = (claimed_group_code IS NULL)),
  CONSTRAINT released_slot_offers_expiry_check
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS released_slot_offers_open_expiry_idx
  ON public.released_slot_offers (expires_at, created_at DESC)
  WHERE claimed_at IS NULL;

CREATE INDEX IF NOT EXISTS released_slot_offers_space_date_idx
  ON public.released_slot_offers (space_id, booking_date);
