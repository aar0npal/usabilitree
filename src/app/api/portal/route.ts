import { Portal } from "@creem_io/nextjs";
import { env } from "@/env";

export const GET = Portal({
  apiKey: env.CREEM_API_KEY!,
  testMode: env.NODE_ENV !== "production",
});
