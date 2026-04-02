import { Checkout } from "@creem_io/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";

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
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.searchParams.set("referenceId", user.id);
      return checkoutHandler(new NextRequest(url, { headers: req.headers }));
    }
  : async () => NextResponse.json({ error: "Checkout is not configured" }, { status: 503 });
