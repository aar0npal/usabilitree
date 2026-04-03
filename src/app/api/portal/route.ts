import { Portal } from "@creem_io/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { createRouteLogger } from "@/lib/posthog/server-logs";

const apiKey = env.CREEM_API_KEY;

const portalHandler = apiKey
  ? Portal({
      apiKey,
      testMode: env.NEXT_PUBLIC_CREEM_TEST_MODE,
    })
  : null;

export const GET = portalHandler
  ? async (req: NextRequest) => {
      const routeLogger = createRouteLogger("/api/portal", "GET");
      routeLogger.flush();

      try {
        const user = await getCurrentUser();
        if (!user) {
          routeLogger.warn("Unauthorized billing portal request");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requested = req.nextUrl.searchParams.get("customerId");
        if (!user.creemCustomerId) {
          routeLogger.warn("Billing profile missing", {
            user_id: user.id,
          });
          return NextResponse.json(
            { error: "No billing profile for this account" },
            { status: 403 }
          );
        }

        if (!requested || requested !== user.creemCustomerId) {
          routeLogger.warn("Billing portal access forbidden", {
            user_id: user.id,
          });
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        routeLogger.info("Billing portal request forwarded", {
          user_id: user.id,
        });

        return portalHandler(req);
      } catch (error) {
        routeLogger.error("Billing portal request failed", error);
        return NextResponse.json({ error: "Billing portal request failed" }, { status: 500 });
      }
    }
  : async () => {
      const routeLogger = createRouteLogger("/api/portal", "GET");
      routeLogger.flush();
      routeLogger.warn("Billing portal called without configuration");
      return NextResponse.json({ error: "Billing portal is not configured" }, { status: 503 });
    };
