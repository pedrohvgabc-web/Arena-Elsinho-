import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";
import { getDb } from "@/lib/db.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

export const Route = createFileRoute("/api/gallery/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!UUID_PATTERN.test(id)) return notFound();

        const db = getDb();
        const rows = (await db`
          SELECT image_data, is_active
          FROM public.arena_gallery_photos
          WHERE id = ${id}::uuid
          LIMIT 1
        `) as unknown as Array<{ image_data: Uint8Array; is_active: boolean }>;
        const photo = rows[0];
        if (!photo) return notFound();

        if (!photo.is_active) {
          try {
            await requireAdmin();
          } catch {
            return notFound();
          }
        }

        const imageBody = new ArrayBuffer(photo.image_data.byteLength);
        new Uint8Array(imageBody).set(photo.image_data);
        return new Response(imageBody, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Cache-Control": photo.is_active
              ? "public, max-age=3600, s-maxage=3600"
              : "private, no-store",
          },
        });
      },
    },
  },
});
