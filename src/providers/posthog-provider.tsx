"use client";
import { env } from "@/env";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_REVERSE_PROXY,
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
    person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: true,
    },
    disable_session_recording: true, // Disable session recording
    loaded: (posthog) => {
      if (process.env.NODE_ENV !== "development") posthog.startSessionRecording();
    },
  });
}
import { ReactNode } from "react";

export function CSPostHogProvider({ children }: { children: ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
