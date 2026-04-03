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
      routeLogger.flush();

      try {
        const user = await getCurrentUser();
        if (!user) {
          routeLogger.warn("Unauthorized checkout request");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = req.nextUrl.clone();
        url.searchParams.set("referenceId", user.id);

        routeLogger.info("Checkout request forwarded", {
          user_id: user.id,
        });

        return checkoutHandler(new NextRequest(url, { headers: req.headers }));
      } catch (error) {
        routeLogger.error("Checkout request failed", error);
        return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
      }
    }
  : async () => {
      const routeLogger = createRouteLogger("/api/checkout", "GET");
      routeLogger.flush();
      routeLogger.warn("Checkout called without configuration");
      return NextResponse.json({ error: "Checkout is not configured" }, { status: 503 });
    };
