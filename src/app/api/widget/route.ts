import { NextResponse } from "next/server";
import { createRouteLogger } from "@/lib/posthog/server-logs";

export async function GET(request: Request) {
  const routeLogger = createRouteLogger("/api/widget", "GET", request);

  try {
    const response = await fetch("https://cdn.userjot.com/sdk/v2/uj.js", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      routeLogger.warn("Widget proxy upstream failed", {
        status_code: response.status,
      });
      return NextResponse.json({ error: "Failed to fetch widget" }, { status: 500 });
    }

    const script = await response.text();

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    routeLogger.error("Widget proxy exception", error);
    return NextResponse.json({ error: "Failed to fetch widget" }, { status: 500 });
  } finally {
    routeLogger.flush();
  }
}
