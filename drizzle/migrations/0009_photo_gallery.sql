-- Admin-managed WebP images for the public photo gallery.
CREATE TABLE IF NOT EXISTS public.arena_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  alt_text text NOT NULL,
  image_data bytea NOT NULL,
  size_bytes integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arena_gallery_photos_size_bytes_check CHECK (size_bytes BETWEEN 1 AND 614400)
);

CREATE INDEX IF NOT EXISTS arena_gallery_photos_order_idx
  ON public.arena_gallery_photos (sort_order, created_at, id);

CREATE INDEX IF NOT EXISTS arena_gallery_photos_active_order_idx
  ON public.arena_gallery_photos (sort_order, created_at, id)
  WHERE is_active = true;
