"use client";

import { ThemeProvider } from "@/providers/theme-provider";
import { usePathname } from "next/navigation";

type AppThemeProviderProps = {
  children: React.ReactNode;
};

function isParticipantTreeTestRoute(pathname: string | null): boolean {
  if (!pathname) return false;

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "treetest") return false;

  // Force only participant links: /treetest/[id] and /treetest/preview/[id] (+ nested steps)
  if (parts[1] === "preview") return parts.length >= 3;

  return parts.length >= 2 && parts[1] !== "setup" && parts[1] !== "results";
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