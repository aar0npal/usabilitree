"use client";
import { env } from "@/env";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode, useEffect } from "react";

if (typeof window !== "undefined") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_REVERSE_PROXY ?? env.NEXT_PUBLIC_POSTHOG_HOST,
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
    // Prevent auto-start of session recording; started manually below for non-dev envs only
    disable_session_recording: true,
    loaded: (posthog) => {
      if (process.env.NODE_ENV !== "development") posthog.startSessionRecording();
    },
  });
}

function PostHogRequestHeadersBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const globalState = window as typeof window & {
      __usabilitreePosthogFetchPatched?: boolean;
      __usabilitreeOriginalFetch?: typeof window.fetch;
    };

    if (globalState.__usabilitreePosthogFetchPatched) return;

    const originalFetch = window.fetch.bind(window);
    globalState.__usabilitreePosthogFetchPatched = true;
    globalState.__usabilitreeOriginalFetch = originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const inputUrl =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const url = new URL(inputUrl, window.location.origin);

        if (url.origin !== window.location.origin) {
          return originalFetch(input, init);
        }

        const mergedHeaders = new Headers(input instanceof Request ? input.headers : undefined);
        if (init?.headers) {
          const initHeaders = new Headers(init.headers);
          initHeaders.forEach((value, key) => mergedHeaders.set(key, value));
        }

        const distinctId = posthog.get_distinct_id?.();
        const sessionId = posthog.get_session_id?.();

        if (distinctId) {
          mergedHeaders.set("X-POSTHOG-DISTINCT-ID", distinctId);
        }
        if (sessionId) {
          mergedHeaders.set("X-POSTHOG-SESSION-ID", sessionId);
        }

        return originalFetch(input, {
          ...init,
          headers: mergedHeaders,
        });
      } catch {
        return originalFetch(input, init);
      }
    };

    return () => {
      if (globalState.__usabilitreeOriginalFetch) {
        window.fetch = globalState.__usabilitreeOriginalFetch;
      }
      globalState.__usabilitreePosthogFetchPatched = false;
      globalState.__usabilitreeOriginalFetch = undefined;
    };
  }, []);

  return null;
}

export function CSPostHogProvider({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider client={posthog}>
      <PostHogRequestHeadersBridge />
      {children}
    </PostHogProvider>
  );
}
