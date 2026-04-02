import { Checkout } from "@creem_io/nextjs";
import { env } from "@/env";

export const GET = Checkout({
  apiKey: env.CREEM_API_KEY!,
  testMode: env.NODE_ENV !== "production",
  defaultSuccessUrl: "/dashboard/billing",
});
