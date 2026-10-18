"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DURATION_MS = 200;

export function TreeTestBranch({ open, children }: { open: boolean; children: () => ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (!open && !wasOpen.current) return;
    wasOpen.current = open;
    let frame: number;
    let timer: ReturnType<typeof setTimeout>;

    if (open) {
      setMounted(true);
      // Paint the newly mounted content at zero height before expanding it.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setExpanded(true));
      });
    } else {
      setExpanded(false);
      // Also unmount when a background tab or reduced motion skips transition events.
      timer = setTimeout(() => setMounted(false), DURATION_MS);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      ref={(element) => {
        if (element) element.inert = !open;
      }}
      aria-hidden={!open || undefined}
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        !open && "pointer-events-none"
      )}
      onTransitionEnd={(event) => {
        if (
          !open &&
          event.target === event.currentTarget &&
          event.propertyName === "grid-template-rows"
        ) {
          setMounted(false);
        }
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="pt-2">{children()}</div>
      </div>
    </div>
  );
}
