"use client";

import { ThemeProvider } from "@/providers/theme-provider";
import { usePathname } from "next/navigation";

type AppThemeProviderProps = {
  children: React.ReactNode;
};

// Admin routes under (main)/treetest/ that should NOT be forced to light mode.
// Add any new admin segments here to prevent them from being affected.
const ADMIN_SEGMENTS = new Set(["setup", "results"]);

function isParticipantTreeTestRoute(pathname: string | null): boolean {
  if (!pathname) return false;

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "treetest") return false;
  if (parts.length < 2) return false;

  // /treetest/preview/[id] is participant-facing
  if (parts[1] === "preview") return parts.length >= 3;

  // Any known admin segment is not participant-facing
  if (ADMIN_SEGMENTS.has(parts[1])) return false;

  // Everything else under /treetest/[id] is participant-facing
  return true;
}

export default function AppThemeProvider({ children }: AppThemeProviderProps) {
  const pathname = usePathname();
  const forcedTheme = isParticipantTreeTestRoute(pathname) ? "light" : undefined;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
      {children}
    </ThemeProvider>
  );
}
