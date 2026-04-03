import { cookies } from "next/headers";
import { generateState } from "arctic";
import { discord } from "@/lib/auth";
import { env } from "@/env";
import { createRouteLogger } from "@/lib/posthog/server-logs";

export async function GET(request: Request): Promise<Response> {
  const routeLogger = createRouteLogger("/api/login/discord", "GET", request);

  try {
    const state = generateState();
    const url = discord.createAuthorizationURL(state, ["identify", "email"]);

    cookies().set("discord_oauth_state", state, {
      path: "/",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    routeLogger.info("Discord OAuth redirect initialized");

    return Response.redirect(url);
  } finally {
    await routeLogger.flush();
  }
}
