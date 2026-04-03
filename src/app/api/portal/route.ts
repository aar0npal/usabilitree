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
      const routeLogger = createRouteLogger("/api/portal", "GET", req);

      try {
        const user = await getCurrentUser();
        if (!user) {
          routeLogger.warn("Unauthorized billing portal request");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        routeLogger.setUser({ id: user.id, email: user.email });

        const requested = req.nextUrl.searchParams.get("customerId");
        if (!user.creemCustomerId) {
          routeLogger.warn("Billing profile missing");
          return NextResponse.json(
            { error: "No billing profile for this account" },
            { status: 403 }
          );
        }

        if (!requested || requested !== user.creemCustomerId) {
          routeLogger.warn("Billing portal access forbidden");
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        routeLogger.info("Billing portal request forwarded");

        return portalHandler(req);
      } catch (error) {
        routeLogger.error("Billing portal request failed", error);
        return NextResponse.json({ error: "Billing portal request failed" }, { status: 500 });
      } finally {
        await routeLogger.flush();
      }
    }
  : async () => {
      const routeLogger = createRouteLogger("/api/portal", "GET");
      routeLogger.warn("Billing portal called without configuration");
      await routeLogger.flush();
      return NextResponse.json({ error: "Billing portal is not configured" }, { status: 503 });
    };
