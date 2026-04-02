import { Webhook } from "@creem_io/nextjs";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { db } from "@/db";
import { users } from "@/db/schema";
import { STUDIES_PER_PURCHASE } from "@/lib/billing/study-limit";
import { eq, sql } from "drizzle-orm";

export const POST = Webhook({
  webhookSecret: env.CREEM_WEBHOOK_SECRET!,

  onCheckoutCompleted: async ({ customer, metadata }) => {
    const userId = metadata?.referenceId as string | undefined;
    if (!userId) {
      console.error("[creem/webhook] checkout.completed missing referenceId");
      return;
    }

    await db
      .update(users)
      .set({
        studyLimit: sql`${users.studyLimit} + ${STUDIES_PER_PURCHASE}`,
        ...(customer?.id ? { creemCustomerId: customer.id } : {}),
      })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
  },
});
