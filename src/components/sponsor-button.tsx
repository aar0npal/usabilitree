"use client";

import { DASHBOARD_TOUR_STEP_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";
import { usePostHog } from "posthog-js/react";

const KoFi = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 640 640" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M313.8 139c89.8 0 113 1.1 146.3 4.4c78.1 7.8 123.6 56 123.6 125.2v8.9c0 64.3-47.1 116.9-110.8 122.4c-5 16.6-12.8 33.2-23.3 49.9c-24.4 37.7-73.1 85.3-162.9 85.3H269c-73.1 0-129.7-31.6-163.5-89.2c-29.9-50.4-33.8-106.4-33.8-181.2c0-73.7 44.4-113.6 96.4-120.2c39.3-5 88.1-5.5 145.7-5.5m0 41.6c-60.4 0-103.6.5-136.3 5.5c-46 6.7-64.3 32.7-64.3 79.2l.2 25.7c1.2 57.3 7.1 97.1 27.5 134.5c26.6 49.3 74.8 68.2 129.7 68.2h17.2c72 0 107-34.9 126.3-65.4c9.4-15.5 17.7-32.7 22.2-54.3l3.3-13.8h19.9c44.3 0 82.6-36 82.6-82v-8.3c0-51.5-32.2-78.7-88.1-85.3c-31.6-2.8-50.4-3.9-140.2-3.9zm17.2 52.6c38.2 0 64.8 31.6 64.8 67c0 32.7-18.3 61-42.1 83.1c-15 15-39.3 30.5-55.9 40.5c-4.4 2.8-10 4.4-16.7 4.4c-5.5 0-10.5-1.7-15.5-4.4c-16.6-10-41-25.5-56.5-40.5c-21.8-20.8-39.2-46.9-41.3-77l-.2-6.1c0-35.5 25.5-67 64.3-67c22.7 0 38.8 11.6 49.3 27.7c11.6-16.1 27.2-27.7 49.9-27.7zm122.5-3.9c28.3 0 43.8 16.6 43.8 43.2s-15.5 42.7-43.8 42.7c-8.9 0-13.8-5-13.8-11.7v-62.6c0-6.7 5-11.6 13.8-11.6" />
  </svg>
);

interface SponsorButtonProps {
  className?: string;
  variant?: "header" | "nav";
}

export function SponsorButton({ className, variant = "nav" }: SponsorButtonProps) {
  const posthog = usePostHog();

  const handleSponsorClick = () => {
    // Track PostHog event
    posthog?.capture("donate_button_clicked", {
      variant,
    });

    window.open("https://ko-fi.com/aaronpal", "_blank", "noopener,noreferrer");
  };

  if (variant === "header") {
    return (
      <button
        id={DASHBOARD_TOUR_STEP_IDS.SUPPORT + "-mob"}
        onClick={handleSponsorClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground md:hidden",
          className
        )}
        title="Support with a donation"
      >
        <KoFi className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      id={DASHBOARD_TOUR_STEP_IDS.SUPPORT}
      onClick={handleSponsorClick}
      className={cn(
        "hidden items-center whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground md:flex",
        className
      )}
      title="Support with a donation"
    >
      <KoFi className="mr-2 h-4 w-4 flex-shrink-0" />
      <span>Donate</span>
    </button>
  );
}
