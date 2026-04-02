import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { applyCreemCheckoutCredit } from "../creem-checkout-credit";

const migrationsFolder = path.join(process.cwd(), "drizzle");

describe("applyCreemCheckoutCredit", () => {
  let memDb: LibSQLDatabase<typeof schema>;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "usabilitree-creem-test-"));
    const dbFile = path.join(tmpDir, "test.db");
    const client = createClient({ url: `file:${dbFile}` });
    memDb = drizzle(client, { schema });
    await migrate(memDb, { migrationsFolder });

    await memDb.insert(schema.users).values({
      id: "user_test_webhook_01",
      email: "wh@example.com",
      emailVerified: false,
      studyLimit: 3,
    });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("increments study limit on first webhook id", async () => {
    await applyCreemCheckoutCredit(
      { webhookId: "evt_first", userId: "user_test_webhook_01" },
      memDb,
    );

    const [row] = await memDb
      .select({ studyLimit: schema.users.studyLimit })
      .from(schema.users)
      .where(eq(schema.users.id, "user_test_webhook_01"));

    expect(row?.studyLimit).toBe(8);
  });

  it("does not increment again for the same webhook id", async () => {
    await applyCreemCheckoutCredit(
      { webhookId: "evt_first", userId: "user_test_webhook_01" },
      memDb,
    );

    const [row] = await memDb
      .select({ studyLimit: schema.users.studyLimit })
      .from(schema.users)
      .where(eq(schema.users.id, "user_test_webhook_01"));

    expect(row?.studyLimit).toBe(8);
  });

  it("applies a new credit for a different webhook id", async () => {
    await applyCreemCheckoutCredit(
      { webhookId: "evt_second", userId: "user_test_webhook_01" },
      memDb,
    );

    const [row] = await memDb
      .select({ studyLimit: schema.users.studyLimit })
      .from(schema.users)
      .where(eq(schema.users.id, "user_test_webhook_01"));

    expect(row?.studyLimit).toBe(13);
  });

  it("rolls back when user id does not exist so webhook id is not recorded", async () => {
    await expect(
      applyCreemCheckoutCredit(
        { webhookId: "evt_missing_user", userId: "user_does_not_exist" },
        memDb,
      ),
    ).rejects.toThrow(/no user row/);

    const rows = await memDb
      .select()
      .from(schema.creemProcessedWebhooks)
      .where(eq(schema.creemProcessedWebhooks.webhookId, "evt_missing_user"));

    expect(rows.length).toBe(0);
  });
});
