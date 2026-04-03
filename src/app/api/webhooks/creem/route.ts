import { Webhook } from "@creem_io/nextjs";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { db } from "@/db";
import { applyCreemCheckoutCredit } from "@/lib/billing/creem-checkout-credit";
import { createRouteLogger } from "@/lib/posthog/server-logs";

function webhookNotConfigured() {
  return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
}

const webhookSecret = env.CREEM_WEBHOOK_SECRET;
const routeLogger = createRouteLogger("/api/webhooks/creem", "POST");

const configuredWebhookHandler = webhookSecret
  ? Webhook({
      webhookSecret: webhookSecret,

      onCheckoutCompleted: async ({ customer, metadata, webhookId }) => {
        if (!webhookId) {
          routeLogger.error("[creem/webhook] checkout.completed missing webhookId", undefined);
          throw new Error("missing webhookId");
        }

        const userId = metadata?.referenceId;
        if (!userId || typeof userId !== "string") {
          routeLogger.error(
            "[creem/webhook] checkout.completed missing metadata.referenceId",
            undefined,
            {
              webhook_id: webhookId,
            }
          );
          throw new Error("missing referenceId");
        }
        if (!/^[A-Za-z0-9]{10,50}$/.test(userId)) {
          routeLogger.error(
            "[creem/webhook] checkout.completed invalid metadata.referenceId format",
            undefined,
            {
              webhook_id: webhookId,
            }
          );
          throw new Error("invalid referenceId format");
        }

        await applyCreemCheckoutCredit(
          {
            webhookId,
            userId,
            customerId: customer?.id,
          },
          db
        );

        routeLogger.info("[creem/webhook] checkout.completed processed", {
          webhook_id: webhookId,
          user_id: userId,
        });

        revalidatePath("/dashboard/billing");
        revalidatePath("/dashboard");
      },
    })
  : null;

export const POST = async (request: NextRequest) => {
  routeLogger.flush();

  if (!configuredWebhookHandler) {
    routeLogger.warn("Creem webhook called without configuration");
    return webhookNotConfigured();
  }

  try {
    return await configuredWebhookHandler(request);
  } catch (error) {
    routeLogger.error("Creem webhook processing failed", error);
    throw error;
  }
};
