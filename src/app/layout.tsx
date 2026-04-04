import type { Metadata } from "next";
import "../styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import LightIcon from "@/assets/icons/icon-light.svg";
import DarkIcon from "@/assets/icons/icon-dark.svg";
import AppThemeProvider from "@/providers/app-theme-provider";
import { APP_TITLE } from "@/lib/constants";
import localFont from "next/font/local";
import { CSPostHogProvider } from "@/providers/posthog-provider";
import PostHogPageView from "@/components/posthog/post-hog-page-view-";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_TITLE}`,
  },
  description: "UsabiliTree - Grow your UX with Tree Testing",
  icons: {
    icon: [
      {
        rel: "icon",
        media: "(prefers-color-scheme: light)",
        type: "image/svg+xml",
        url: LightIcon.src,
      },
      {
        rel: "icon",
        media: "(prefers-color-scheme: dark)",
        type: "image/svg+xml",
        url: DarkIcon.src,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CSPostHogProvider>
          <AppThemeProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            {children}
            <Toaster />
          </AppThemeProvider>
        </CSPostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
