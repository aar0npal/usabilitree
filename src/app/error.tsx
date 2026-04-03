"use client";

import { Button } from "@/components/ui/button";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.captureException(error);
  }, [error, posthog]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This crash has been captured and we are looking into it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
