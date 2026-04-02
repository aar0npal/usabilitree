import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { STUDIES_PER_PURCHASE } from "./study-limit";

export async function applyCreemCheckoutCredit(
  opts: { webhookId: string; userId: string; customerId?: string },
  database: LibSQLDatabase<typeof schema>,
): Promise<void> {
  const { webhookId, userId, customerId } = opts;

  await database.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.creemProcessedWebhooks)
      .values({ webhookId })
      .onConflictDoNothing()
      .returning({ id: schema.creemProcessedWebhooks.webhookId });

    if (inserted.length === 0) {
      return;
    }

    const updated = await tx
      .update(schema.users)
      .set({
        studyLimit: sql`${schema.users.studyLimit} + ${STUDIES_PER_PURCHASE}`,
        ...(customerId ? { creemCustomerId: customerId } : {}),
      })
      .where(eq(schema.users.id, userId));

    if (updated.rowsAffected === 0) {
      throw new Error("Creem checkout credit: no user row for referenceId");
    }
  });
}
