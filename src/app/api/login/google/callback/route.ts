import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { generateId, google } from "@/lib/auth";
import { setSession } from "@/lib/auth/session";
import { Paths } from "@/lib/constants";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
import { users } from "@/db/schema";
import { notifyNewUser } from "@/lib/discord";
import * as Sentry from "@sentry/react";
import { createSampleTreeTestStudy } from "@/lib/treetest/sample-actions";
import { createRouteLogger } from "@/lib/posthog/server-logs";

export async function GET(request: Request): Promise<Response> {
  const routeLogger = createRouteLogger("/api/login/google/callback", "GET");
  routeLogger.flush();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get("google_oauth_state")?.value ?? null;
  const codeVerifier = cookies().get("google_code_verifier")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    routeLogger.warn("Google OAuth callback rejected due to invalid state");
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);

    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    });
    const googleUser: GoogleUser = await response.json();

    const [existingUser] = await db
      .select()
      .from(users)
      .where(or(eq(users.googleId, googleUser.sub), eq(users.email, googleUser.email)));

    const avatar = googleUser.picture;

    if (!existingUser) {
      const userId = generateId(21);
      await db.insert(users).values({
        id: userId,
        email: googleUser.email,
        emailVerified: googleUser.email_verified,
        googleId: googleUser.sub,
        avatar,
      });
      await notifyNewUser(
        userId,
        googleUser.email,
        googleUser.email_verified ? "Yes (Google)" : "No (Google)",
        avatar
      );
      await setSession(userId);
      routeLogger.info("Google OAuth user created", {
        user_id: userId,
      });

      try {
        await createSampleTreeTestStudy();
      } catch (error) {
        // Sample study creation is best-effort — do not block OAuth onboarding
        routeLogger.error("Google onboarding sample study creation failed", error, {
          user_id: userId,
        });
      }
      return new Response(null, {
        status: 302,
        headers: {
          Location: Paths.Dashboard + "?onboarding=1",
        },
      });
    }

    if (existingUser.googleId !== googleUser.sub || existingUser.avatar !== avatar) {
      await db
        .update(users)
        .set({
          googleId: googleUser.sub,
          emailVerified: true,
          avatar,
        })
        .where(eq(users.id, existingUser.id));
    }

    routeLogger.info("Google OAuth user signed in", {
      user_id: existingUser.id,
    });

    await setSession(existingUser.id);
    return new Response(null, {
      status: 302,
      headers: {
        Location: Paths.Dashboard,
      },
    });
  } catch (error) {
    // the specific error message depends on the provider
    if (error instanceof OAuth2RequestError) {
      // invalid code
      routeLogger.warn("Google OAuth invalid authorization code");
      return new Response(null, {
        status: 400,
      });
    }

    routeLogger.error("Google OAuth callback failed", error);
    Sentry.captureException(error);
    return new Response(null, {
      status: 500,
    });
  }
}

export interface GoogleUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}
