"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import type { User } from "@/db/schema";

export function usePostHogIdentify(user: User | null | undefined) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    if (user) {
      // Identify the user with PostHog
      posthog.identify(user.id, {
        email: user.email,
        email_verified: user.emailVerified,
        has_password: !!user.hashedPassword,
        has_discord: !!user.discordId,
        has_google: !!user.googleId,
        creem_customer_id: user.creemCustomerId,
        study_limit: user.studyLimit,
        created_at: user.createdAt,
        avatar: user.avatar,
        has_purchased: !!user.creemCustomerId,
      });
    } else {
      // Reset identification when user logs out
      posthog.reset();
    }
  }, [user, posthog]);
}
