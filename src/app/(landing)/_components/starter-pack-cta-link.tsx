"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePostHog } from "posthog-js/react";

interface StarterPackCtaLinkProps {
  href: string;
  isAuthenticated: boolean;
}

export function StarterPackCtaLink({ href, isAuthenticated }: StarterPackCtaLinkProps) {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.capture("starter_pack_landing_cta_clicked", {
      entry_point: "landing_pricing",
      redirect_target: href,
      is_authenticated: isAuthenticated,
      price_usd: 5,
    });
  };

  return (
    <Button asChild className="w-full">
      <Link href={href} onClick={handleClick}>
        Get Starter Study Pack &mdash; $5
      </Link>
    </Button>
  );
}
