"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon, GearIcon, BellIcon, CreditCard } from "@/components/icons";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/feedback-button";
import { SponsorButton } from "@/components/sponsor-button";
import { RoadmapButton } from "@/components/roadmap-button";
import { DASHBOARD_TOUR_STEP_IDS } from "@/lib/constants";
import { usePostHog } from "posthog-js/react";

// Store the latest update date in a constant at the top of the file
// This makes it easier to update in one place when new content is added
const LATEST_UPDATE_DATE = "2026-04-02"; // Update this when new content is added

const items = [
  {
    title: "Studies",
    href: "/dashboard",
    icon: FileTextIcon,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    id: DASHBOARD_TOUR_STEP_IDS.UPDATES,
    title: "Updates",
    href: "/dashboard/updates",
    icon: BellIcon,
    hasNewContent: true,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: GearIcon,
  },
];

interface Props {
  className?: string;
}

export function DashboardNav({ className }: Props) {
  const path = usePathname();
  const posthog = usePostHog();
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);

  useEffect(() => {
    // Check if user has seen the latest updates
    const lastSeenUpdate = localStorage.getItem("lastSeenUpdate");
    setHasUnreadUpdates(!lastSeenUpdate || lastSeenUpdate < LATEST_UPDATE_DATE);
  }, []);

  useEffect(() => {
    // Mark updates as read when visiting the updates page
    if (path === "/dashboard/updates") {
      localStorage.setItem("lastSeenUpdate", LATEST_UPDATE_DATE);
      setHasUnreadUpdates(false);
    }
  }, [path]);

  const handleNavClick = (item: (typeof items)[0]) => {
    if (item.title === "Updates") {
      posthog?.capture("updates_page_clicked", {
        has_unread: hasUnreadUpdates,
      });
    }
  };

  return (
    <nav className={cn(className)}>
      {items.map((item) => (
        <Link id={item.id} href={item.href} key={item.href} onClick={() => handleNavClick(item)}>
          <span
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              path === item.href ? "bg-accent" : "transparent"
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
            {item.hasNewContent && hasUnreadUpdates && (
              <span className="relative ml-2 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-theme opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-theme"></span>
              </span>
            )}
          </span>
        </Link>
      ))}

      <FeedbackButton />
      <RoadmapButton />
      <SponsorButton />
    </nav>
  );
}
