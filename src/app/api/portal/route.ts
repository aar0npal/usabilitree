import { Portal } from "@creem_io/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";

const apiKey = env.CREEM_API_KEY;

const portalHandler = apiKey
  ? Portal({
      apiKey,
      testMode: env.NEXT_PUBLIC_CREEM_TEST_MODE,
    })
  : null;

export const GET = portalHandler
  ? async (req: NextRequest) => {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const requested = req.nextUrl.searchParams.get("customerId");
      if (!user.creemCustomerId) {
        return NextResponse.json({ error: "No billing profile for this account" }, { status: 403 });
      }
      if (!requested || requested !== user.creemCustomerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return portalHandler(req);
    }
  : async () => NextResponse.json({ error: "Billing portal is not configured" }, { status: 503 });
