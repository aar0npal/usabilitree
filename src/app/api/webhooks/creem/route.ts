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

function createConfiguredWebhookHandler(
  routeLogger: ReturnType<typeof createRouteLogger>,
  webhookSecret: string
) {
  return Webhook({
    webhookSecret,

    onCheckoutCompleted: async ({ customer, metadata, webhookId, product }) => {
      if (!webhookId) {
        routeLogger.error("[creem/webhook] checkout.completed missing webhookId", undefined);
        throw new Error("missing webhookId");
      }

      const configuredProductId = env.NEXT_PUBLIC_CREEM_PRODUCT_ID;
      if (!configuredProductId) {
        routeLogger.error("[creem/webhook] checkout.completed missing configured product ID", undefined, {
          webhook_id: webhookId,
        });
        throw new Error("missing configured product ID");
      }

      if (!product?.id || product.id !== configuredProductId) {
        routeLogger.warn("[creem/webhook] checkout.completed ignored for unexpected product", {
          webhook_id: webhookId,
          product_id: product?.id,
        });
        return;
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
        product_id: configuredProductId,
      });

      revalidatePath("/dashboard/billing");
      revalidatePath("/dashboard");
    },
  });
}

export const POST = async (request: NextRequest) => {
  const routeLogger = createRouteLogger("/api/webhooks/creem", "POST", request);
  routeLogger.flush();

  if (!webhookSecret) {
    routeLogger.warn("Creem webhook called without configuration");
    return webhookNotConfigured();
  }

  const configuredWebhookHandler = createConfiguredWebhookHandler(routeLogger, webhookSecret);

  try {
    return await configuredWebhookHandler(request);
  } catch (error) {
    routeLogger.error("Creem webhook processing failed", error);
    throw error;
  }
};
