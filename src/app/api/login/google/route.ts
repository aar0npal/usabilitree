import { google } from "@/lib/auth";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { createRouteLogger } from "@/lib/posthog/server-logs";

export async function GET(request: Request): Promise<Response> {
  const routeLogger = createRouteLogger("/api/login/google", "GET", request);

  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

    cookies().set("google_oauth_state", state, {
      secure: true,
      path: "/",
      httpOnly: true,
      maxAge: 60 * 10,
    });

    cookies().set("google_code_verifier", codeVerifier, {
      secure: true,
      path: "/",
      httpOnly: true,
      maxAge: 60 * 10,
    });

    routeLogger.info("Google OAuth redirect initialized");

    return Response.redirect(url);
  } finally {
    await routeLogger.flush();
  }
}
