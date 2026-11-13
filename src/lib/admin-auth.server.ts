import { getDb } from "./db.server";

const ADMIN_COOKIE = "ae_admin";

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Validates the existing admin cookie against its unexpired database session. */
export async function requireAdmin() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(ADMIN_COOKIE);
  if (!token) throw new Error("UNAUTHORIZED");

  const db = getDb();
  const rows = (await db`
    SELECT id FROM public.admin_sessions
    WHERE token_hash = ${await sha256(token)} AND expires_at > now()
    LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (!rows[0]) throw new Error("UNAUTHORIZED");
  return rows[0].id;
}
