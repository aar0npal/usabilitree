import { Portal } from "@creem_io/nextjs";
import { NextResponse } from "next/server";
import { env } from "@/env";

const apiKey = env.CREEM_API_KEY;

export const GET = apiKey
  ? Portal({
      apiKey,
      testMode: env.NEXT_PUBLIC_CREEM_TEST_MODE,
    })
  : async () => NextResponse.json({ error: "Billing portal is not configured" }, { status: 503 });
