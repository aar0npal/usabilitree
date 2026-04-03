import { Checkout } from "@creem_io/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { createRouteLogger } from "@/lib/posthog/server-logs";

const apiKey = env.CREEM_API_KEY;

const checkoutHandler = apiKey
  ? Checkout({
      apiKey,
      testMode: env.NEXT_PUBLIC_CREEM_TEST_MODE,
      defaultSuccessUrl: "/dashboard/billing",
    })
  : null;

export const GET = checkoutHandler
  ? async (req: NextRequest) => {
      const routeLogger = createRouteLogger("/api/checkout", "GET", req);

      try {
        const user = await getCurrentUser();
        if (!user) {
          routeLogger.warn("Unauthorized checkout request");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        routeLogger.setUser({ id: user.id, email: user.email });

        const configuredProductId = env.NEXT_PUBLIC_CREEM_PRODUCT_ID;
        if (!configuredProductId) {
          routeLogger.error("Checkout product is not configured", undefined);
          return NextResponse.json(
            { error: "Checkout product is not configured" },
            { status: 503 }
          );
        }

        const requestedProductId = req.nextUrl.searchParams.get("productId");
        if (requestedProductId && requestedProductId !== configuredProductId) {
          routeLogger.warn("Checkout request product mismatch");
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const url = req.nextUrl.clone();
        url.search = "";
        url.searchParams.set("productId", configuredProductId);
        url.searchParams.set("referenceId", user.id);

        routeLogger.info("Checkout request forwarded", {
          product_id: configuredProductId,
        });

        return checkoutHandler(new NextRequest(url, { headers: req.headers }));
      } catch (error) {
        routeLogger.error("Checkout request failed", error);
        return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
      } finally {
        routeLogger.flush();
      }
    }
  : async () => {
      const routeLogger = createRouteLogger("/api/checkout", "GET");
      routeLogger.warn("Checkout called without configuration");
      routeLogger.flush();
      return NextResponse.json({ error: "Checkout is not configured" }, { status: 503 });
    };
