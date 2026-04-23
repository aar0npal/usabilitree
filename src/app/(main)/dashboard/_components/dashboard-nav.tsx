"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon, GearIcon, BellIcon, CreditCard } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/feedback-button";
import { SponsorButton } from "@/components/sponsor-button";
import { RoadmapButton } from "@/components/roadmap-button";
import { DASHBOARD_TOUR_STEP_IDS } from "@/lib/constants";
import { usePostHog } from "posthog-js/react";

// Store the latest update date in a constant at the top of the file
// This makes it easier to update in one place when new content is added
const LATEST_UPDATE_DATE = "2026-04-24"; // Update this when new content is added

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

function NavLabel({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollWidth > el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className="overflow-hidden whitespace-nowrap"
      style={
        overflowing
          ? {
              WebkitMaskImage:
                "linear-gradient(to right, black calc(100% - 12px), transparent 100%)",
              maskImage: "linear-gradient(to right, black calc(100% - 12px), transparent 100%)",
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

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
      {items.map((item) => {
        const isActive = path === item.href;
        return (
          <Link
            id={item.id}
            href={item.href}
            key={item.href}
            onClick={() => handleNavClick(item)}
            className={cn("min-w-0 md:min-w-full", isActive ? "shrink-0" : "shrink")}
          >
            <span
              className={cn(
                "group flex min-w-0 items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent" : "text-muted-foreground md:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "mr-2" : "mr-1 md:mr-2")} />
              {isActive ? (
                <span className="whitespace-nowrap">{item.title}</span>
              ) : (
                <NavLabel>{item.title}</NavLabel>
              )}
              {item.hasNewContent && hasUnreadUpdates && (
                <span className="relative ml-2 flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-theme opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-theme"></span>
                </span>
              )}
            </span>
          </Link>
        );
      })}

      <FeedbackButton />
      <RoadmapButton />
      <SponsorButton />
    </nav>
  );
}
