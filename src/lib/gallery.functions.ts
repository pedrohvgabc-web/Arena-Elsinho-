import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type postgres from "postgres";
import { getDb } from "./db.server";
import { requireAdmin } from "./admin-auth.server";

const MAX_IMAGE_BYTES = 600 * 1024;
const MAX_GALLERY_PHOTOS = 50;
const MAX_ACTIVE_PHOTOS = 12;
const GALLERY_LOCK_ID = 731_904_112;

const photoInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o título.")
    .max(120, "O título deve ter até 120 caracteres."),
  altText: z
    .string()
    .trim()
    .min(1, "Informe o texto alternativo.")
    .max(250, "O texto alternativo deve ter até 250 caracteres."),
});

const photoRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  alt_text: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
});

export type PhotoGalleryPhoto = {
  id: string;
  title: string;
  altText: string;
  sortOrder: number;
  imageUrl: string;
};

export type PhotoGalleryAdminItem = PhotoGalleryPhoto & {
  isActive: boolean;
};

type PhotoRow = z.infer<typeof photoRowSchema>;

function publicPhoto(row: PhotoRow) {
  return {
    id: String(row.id),
    title: String(row.title),
    altText: String(row.alt_text),
    sortOrder: Number(row.sort_order),
    imageUrl: `/api/gallery/${row.id}`,
  };
}

function adminPhoto(row: PhotoRow): PhotoGalleryAdminItem {
  return {
    ...publicPhoto(row),
    isActive: Boolean(row.is_active),
  };
}

async function writeAudit(
  tx: postgres.TransactionSql,
  action: string,
  photoId: string | null,
  details: Record<string, unknown>,
) {
  await tx`
    INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
    VALUES ('admin', ${action}, 'arena_gallery_photo', ${photoId}, ${JSON.stringify(details)}::jsonb)
  `;
}

function decodeWebpDataUri(dataUri: string): Buffer | null {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  const encoded = match?.[1];
  if (!encoded || encoded.length % 4 !== 0) return null;

  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 12 || bytes.length > MAX_IMAGE_BYTES) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  // Reject non-canonical base64 strings rather than accepting Buffer's permissive decoding.
  if (bytes.toString("base64") !== encoded) return null;
  return bytes;
}

export const getPublicGalleryPhotos = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const rows = (await db`
    SELECT id::text AS id, title, alt_text, sort_order, is_active
    FROM public.arena_gallery_photos
    WHERE is_active = true
    ORDER BY sort_order, created_at, id
    LIMIT ${MAX_ACTIVE_PHOTOS}
  `) as unknown as PhotoRow[];
  return rows.map((row) => publicPhoto(row));
});

export const adminGalleryPhotos = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = getDb();
  const rows = (await db`
    SELECT id::text AS id, title, alt_text, sort_order, is_active
    FROM public.arena_gallery_photos
    ORDER BY sort_order, created_at, id
    LIMIT ${MAX_GALLERY_PHOTOS}
  `) as unknown as PhotoRow[];
  return rows.map((row) => adminPhoto(row));
});

export const adminUploadGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(photoInputSchema.extend({ imageDataUrl: z.string().max(900_000) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const imageData = decodeWebpDataUri(data.imageDataUrl);
    if (!imageData) {
      return { ok: false as const, error: "Envie uma imagem WebP válida de até 600 KiB." };
    }

    const db = getDb();
    try {
      return await db.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${GALLERY_LOCK_ID})`;
        const counts = (await tx`
          SELECT count(*)::int AS total,
            count(*) FILTER (WHERE is_active = true)::int AS active
          FROM public.arena_gallery_photos
        `) as unknown as Array<{ total: number; active: number }>;
        const count = counts[0] ?? { total: 0, active: 0 };
        if (Number(count.total) >= MAX_GALLERY_PHOTOS) {
          return { ok: false as const, error: "A galeria atingiu o limite de 50 fotos." };
        }
        const isActive = Number(count.active) < MAX_ACTIVE_PHOTOS;
        const rows = (await tx`
          INSERT INTO public.arena_gallery_photos (
            title, alt_text, image_data, size_bytes, sort_order, is_active
          )
          SELECT ${data.title}, ${data.altText}, ${imageData}, ${imageData.byteLength},
            coalesce(max(sort_order), 0) + 1, ${isActive}
          FROM public.arena_gallery_photos
          RETURNING id::text AS id
        `) as unknown as Array<{ id: string }>;
        const id = String(rows[0]?.id ?? "");
        await writeAudit(tx, "gallery.photo.upload", id, {
          title: data.title,
          isActive,
          sizeBytes: imageData.byteLength,
        });
        return { ok: true as const, error: null, isActive };
      });
    } catch (error) {
      console.error(
        "gallery photo upload failed",
        error instanceof Error ? error.message : "unknown",
      );
      return { ok: false as const, error: "Não foi possível adicionar a foto." };
    }
  });

export const adminUpdateGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(photoInputSchema.extend({ id: z.string().uuid(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    try {
      return await db.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${GALLERY_LOCK_ID})`;
        const current = (await tx`
          SELECT id::text AS id, is_active FROM public.arena_gallery_photos
          WHERE id = ${data.id}::uuid FOR UPDATE
        `) as unknown as Array<{ id: string; is_active: boolean }>;
        if (!current[0]) return { ok: false as const, error: "Foto não encontrada." };
        if (data.isActive && !current[0].is_active) {
          const activeRows = (await tx`
            SELECT count(*)::int AS active FROM public.arena_gallery_photos WHERE is_active = true
          `) as unknown as Array<{ active: number }>;
          if (Number(activeRows[0]?.active ?? 0) >= MAX_ACTIVE_PHOTOS) {
            return { ok: false as const, error: "A galeria pública pode ter até 12 fotos ativas." };
          }
        }
        await tx`
          UPDATE public.arena_gallery_photos
          SET title = ${data.title}, alt_text = ${data.altText},
            is_active = ${data.isActive}, updated_at = now()
          WHERE id = ${data.id}::uuid
        `;
        await writeAudit(tx, "gallery.photo.update", data.id, {
          title: data.title,
          isActive: data.isActive,
        });
        return { ok: true as const, error: null };
      });
    } catch (error) {
      console.error(
        "gallery photo update failed",
        error instanceof Error ? error.message : "unknown",
      );
      return { ok: false as const, error: "Não foi possível atualizar a foto." };
    }
  });

export const adminMoveGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    try {
      return await db.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${GALLERY_LOCK_ID})`;
        const rows = (await tx`
          SELECT id::text AS id, sort_order
          FROM public.arena_gallery_photos
          ORDER BY sort_order, created_at, id
          FOR UPDATE
        `) as unknown as Array<{ id: string; sort_order: number }>;
        const index = rows.findIndex((row) => row.id === data.id);
        if (index < 0) return { ok: false as const, error: "Foto não encontrada." };
        const otherIndex = data.direction === "up" ? index - 1 : index + 1;
        const selected = rows[index];
        const adjacent = rows[otherIndex];
        if (!selected || !adjacent) return { ok: true as const, error: null };

        await tx`
          UPDATE public.arena_gallery_photos SET sort_order = ${adjacent.sort_order}, updated_at = now()
          WHERE id = ${selected.id}::uuid
        `;
        await tx`
          UPDATE public.arena_gallery_photos SET sort_order = ${selected.sort_order}, updated_at = now()
          WHERE id = ${adjacent.id}::uuid
        `;
        await writeAudit(tx, "gallery.photo.move", selected.id, {
          direction: data.direction,
          swappedWith: adjacent.id,
        });
        return { ok: true as const, error: null };
      });
    } catch (error) {
      console.error(
        "gallery photo move failed",
        error instanceof Error ? error.message : "unknown",
      );
      return { ok: false as const, error: "Não foi possível reordenar a foto." };
    }
  });

export const adminDeleteGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    try {
      return await db.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${GALLERY_LOCK_ID})`;
        const rows = (await tx`
          SELECT id::text AS id, title, is_active FROM public.arena_gallery_photos
          WHERE id = ${data.id}::uuid FOR UPDATE
        `) as unknown as Array<{ id: string; title: string; is_active: boolean }>;
        if (!rows[0]) return { ok: false as const, error: "Foto não encontrada." };
        await writeAudit(tx, "gallery.photo.delete", data.id, {
          title: rows[0].title,
          wasActive: rows[0].is_active,
        });
        await tx`DELETE FROM public.arena_gallery_photos WHERE id = ${data.id}::uuid`;
        return { ok: true as const, error: null };
      });
    } catch (error) {
      console.error(
        "gallery photo deletion failed",
        error instanceof Error ? error.message : "unknown",
      );
      return { ok: false as const, error: "Não foi possível remover a foto." };
    }
  });
