import { Webhook } from "@creem_io/nextjs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { db } from "@/db";
import { applyCreemCheckoutCredit } from "@/lib/billing/creem-checkout-credit";

function webhookNotConfigured() {
  return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
}

const webhookSecret = env.CREEM_WEBHOOK_SECRET;

export const POST = webhookSecret
  ? Webhook({
      webhookSecret: webhookSecret,

      onCheckoutCompleted: async ({ customer, metadata, webhookId }) => {
        if (!webhookId) {
          console.error("[creem/webhook] checkout.completed missing webhookId");
          return;
        }

        const userId = metadata?.referenceId as string | undefined;
        if (!userId) {
          console.error("[creem/webhook] checkout.completed missing referenceId");
          return;
        }

        await applyCreemCheckoutCredit(
          {
            webhookId,
            userId,
            customerId: customer?.id,
          },
          db,
        );

        revalidatePath("/dashboard/billing");
        revalidatePath("/dashboard");
      },
    })
  : async () => webhookNotConfigured();
