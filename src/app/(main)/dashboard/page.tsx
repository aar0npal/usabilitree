import { redirect } from "next/navigation";
import { env } from "@/env";
import { type Metadata } from "next";
import * as React from "react";
import { Studies } from "./_components/studies";
import { StudiesSkeleton } from "./_components/studies-skeleton";
import { DashboardTracker } from "./_components/dashboard-tracker";
import { Paths } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Studies",
  description: "Manage your studies here",
};

// get onboarding=1 query param to show the tour
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  const showTour = searchParams.onboarding === "1";
  const user = await getCurrentUser();
  if (!user) redirect(Paths.Login);

  return (
    <div>
      <DashboardTracker />
      <div className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Studies</h1>
        <p className="text-sm text-muted-foreground">Manage your studies here</p>
      </div>
      <React.Suspense fallback={<StudiesSkeleton />}>
        <Studies showTour={showTour} />
      </React.Suspense>
    </div>
  );
}
