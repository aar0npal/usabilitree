import { Checkout } from "@creem_io/nextjs";
import { NextResponse } from "next/server";
import { env } from "@/env";

const apiKey = env.CREEM_API_KEY;

export const GET = apiKey
  ? Checkout({
      apiKey,
      testMode: env.NEXT_PUBLIC_CREEM_TEST_MODE,
      defaultSuccessUrl: "/dashboard/billing",
    })
  : async () => NextResponse.json({ error: "Checkout is not configured" }, { status: 503 });
