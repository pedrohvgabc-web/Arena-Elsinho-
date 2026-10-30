import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

/** Return the shared PostgreSQL client without exposing DATABASE_URL to callers. */
export function getDb() {
  if (client) return client;

  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não está configurada.");

  // Neon transaction-pooler URLs are supported without server-side prepared statements.
  client = postgres(url, { prepare: false });
  return client;
}
