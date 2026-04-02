import { env } from "@/env";
import { defineConfig } from "drizzle-kit";

const databaseUrl = env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken:
      databaseUrl.startsWith("file:") || databaseUrl === ":memory:"
        ? undefined
        : (env.DATABASE_AUTH_TOKEN ?? undefined),
  },
  verbose: true,
  strict: true,
});
