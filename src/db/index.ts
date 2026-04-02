import "server-only";

import { env } from "@/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function isLocalDatabaseUrl(url: string): boolean {
  return url.startsWith("file:") || url.includes(":memory:");
}

const databaseUrl = env.DATABASE_URL;
if (!isLocalDatabaseUrl(databaseUrl) && env.DATABASE_AUTH_TOKEN === undefined) {
  throw new Error(
    "DATABASE_AUTH_TOKEN is required when DATABASE_URL is a remote Turso or libsql URL (omit the token only for file: or :memory: databases)."
  );
}
const client = createClient({
  url: databaseUrl,
  // Turso / remote libsql requires a token in dev too; file: and :memory: do not.
  authToken:
    databaseUrl.startsWith("file:") || databaseUrl === ":memory:"
      ? undefined
      : (env.DATABASE_AUTH_TOKEN ?? undefined),
});

export const db = drizzle(client, { schema });
