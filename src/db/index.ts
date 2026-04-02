import { env } from "@/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const databaseUrl = env.DATABASE_URL;
const client = createClient({
  url: databaseUrl,
  // Turso / remote libsql requires a token in dev too; file: and :memory: do not.
  authToken:
    databaseUrl.startsWith("file:") || databaseUrl === ":memory:"
      ? undefined
      : env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle({ client });
