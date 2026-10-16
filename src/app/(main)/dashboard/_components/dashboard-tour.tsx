"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_TOUR_STEP_IDS } from "@/lib/constants";
import { TourAlertDialog, TourStep, useTour } from "@/components/tour";

const steps: TourStep[] = [
  {
    content: (
      <div>
        <h2 className="pr-10 text-lg font-semibold">Sample study</h2>
        <p className="text-sm text-muted-foreground">
          Explore this sample study to see how tree testing works. When you no longer need it,
          delete it from its setup or results page to free up a study slot.
        </p>
      </div>
    ),
    selectorId: DASHBOARD_TOUR_STEP_IDS.SAMPLE_STUDY,
    position: "bottom",
  },
  {
    content: (
      <div>
        <h2 className="pr-10 text-lg font-semibold">Recent updates</h2>
        <p className="text-sm text-muted-foreground">
          Find product updates and development news here.
        </p>
      </div>
    ),
    selectorId: DASHBOARD_TOUR_STEP_IDS.UPDATES,
    position: "bottom",
  },
];

export default function TourDashboard() {
  const router = useRouter();
  const [openTour, setOpenTour] = useState(false);
  const { setSteps, setIsTourCompleted, endTour } = useTour();

  const removeOnboardingParam = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("onboarding");
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }, [router]);

  const handleTourComplete = useCallback(() => {
    try {
      localStorage.setItem("dashboard-tour-completed", "true");
    } catch {
      // Dismissal still works when browser storage is unavailable.
    }
    setOpenTour(false);
    endTour();
    removeOnboardingParam();
  }, [endTour, removeOnboardingParam]);

  useEffect(() => {
    let completed = false;
    try {
      completed = localStorage.getItem("dashboard-tour-completed") === "true";
    } catch {
      // The welcome screen can still be used without browser storage.
    }
    if (completed) {
      removeOnboardingParam();
      return;
    }

    // Studies have loaded, but the sample may have been deleted or renamed.
    const availableSteps = steps.filter((step) => document.getElementById(step.selectorId));
    if (availableSteps.length === 0) {
      removeOnboardingParam();
      return;
    }
    setIsTourCompleted(false);
    setSteps(availableSteps);
    setOpenTour(true);

    return endTour;
  }, [setSteps, setIsTourCompleted, endTour, removeOnboardingParam]);

  const handleOpenChange = (open: boolean) => {
    if (!open) handleTourComplete();
  };

  if (!openTour) return null;

  return (
    <TourAlertDialog
      isOpen={openTour}
      setIsOpen={handleOpenChange}
      onComplete={handleTourComplete}
    />
  );
}
