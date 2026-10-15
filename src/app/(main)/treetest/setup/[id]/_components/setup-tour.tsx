"use client";

import { useState, useEffect, useMemo } from "react";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";
import { TourAlertDialog, TourStep, useTour } from "@/components/tour";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

function TourContent({ title, description }: { title: string; description: string }) {
  // formatDescription to support markdown like bold, underline, italics, and code blocks.
  const formattedDescription = description
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<u>$1</u>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");

  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: formattedDescription }}
      />
    </div>
  );
}

interface TourSetupProps {
  actions: {
    [key: string]: () => void;
  };
  onComplete?: () => void;
}

export default function TourSetup({ actions, onComplete }: TourSetupProps) {
  const [openTour, setOpenTour] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)"); // Tailwind's md breakpoint
  const { setSteps, setIsTourCompleted } = useTour();

  // Reset tour completion state when this component mounts
  useEffect(() => {
    setIsTourCompleted(false);
    setTourStarted(false);
    // Scroll to top to ensure tour elements are visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setIsTourCompleted]);

  // Helper function to wait for element to be ready
  const waitForElement = async (selectorId: string, maxWait = 10000): Promise<void> => {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkElement = () => {
        const element = document.getElementById(selectorId);

        // if element isn't found yet, keep waiting
        if (!element) {
          if (Date.now() - startTime > maxWait) {
            resolve();
            return;
          }
          setTimeout(checkElement, 100);
          return;
        }

        // If element is found, check if it has loaded content (not just skeletons)
        if (element) {
          // Check if there are any loading skeletons present
          const loadingSkeletons = element.querySelectorAll('[class*="skeleton"]');
          const skeletonElements = element.querySelectorAll(".animate-pulse");

          if (loadingSkeletons.length > 0 || skeletonElements.length > 0) {
            setTimeout(checkElement, 100);
            return;
          }

          // Additional checks for different tab types
          if (selectorId === SETUP_TOUR_STEP_IDS.GENERAL) {
            // For general tab, wait for form inputs
            const titleInput = element.querySelector('input[name="title"]');
            const descriptionTextarea = element.querySelector('textarea[name="description"]');

            if (titleInput || descriptionTextarea) {
              resolve();
              return;
            }
          } else if (selectorId === SETUP_TOUR_STEP_IDS.TREE) {
            // For tree tab, wait for the tree editor
            const editor = element.querySelector("[data-tree-editor]");

            if (editor) {
              resolve();
              return;
            }
          } else if (selectorId === SETUP_TOUR_STEP_IDS.TASKS) {
            // For tasks tab, wait for task form or task list
            const taskInput = element.querySelector("input#task-0");

            if (taskInput) {
              resolve();
              return;
            }
          } else if (selectorId === SETUP_TOUR_STEP_IDS.MESSAGES) {
            // For messages tab, wait for message inputs
            const welcomeInput = element.querySelector("textarea#welcome");
            const completionInput = element.querySelector("textarea#completion");

            if (welcomeInput || completionInput) {
              resolve();
              return;
            }
          } else {
            // For other elements, just check if element exists and has some content
            if (element.children.length > 0 || element.textContent?.trim()) {
              resolve();
              return;
            }
          }
        }

        // Check timeout
        if (Date.now() - startTime > maxWait) {
          resolve(); // Resolve anyway to prevent blocking
          return;
        }

        // Continue checking
        setTimeout(checkElement, 100);
      };

      checkElement();
    });
  };

  const steps: TourStep[] = useMemo(() => {
    const baseSteps: TourStep[] = [
      {
        content: (
          <TourContent
            title="General Settings"
            description="Start by setting up your study's basic information - title and description."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.GENERAL,
        position: "top",
        onBeforeStep: async () => {
          actions[SETUP_TOUR_STEP_IDS.GENERAL]?.();
          await waitForElement(SETUP_TOUR_STEP_IDS.GENERAL);
        },
      },
      {
        content: (
          <TourContent
            title="Tree Structure"
            description="Define your information architecture by creating a hierarchical tree structure that participants will navigate."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.TREE,
        position: "top",
        onBeforeStep: async () => {
          actions[SETUP_TOUR_STEP_IDS.TREE]?.();
          await waitForElement(SETUP_TOUR_STEP_IDS.TREE);
        },
      },
      {
        content: (
          <TourContent
            title="Create Tasks"
            description="Add tasks that participants will complete by finding the correct answers in your tree structure."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.TASKS,
        position: "top",
        onBeforeStep: async () => {
          actions[SETUP_TOUR_STEP_IDS.TASKS]?.();
          await waitForElement(SETUP_TOUR_STEP_IDS.TASKS);
        },
      },
      {
        content: (
          <TourContent
            title="Custom Messages"
            description="Customize the welcome and completion messages that participants will see during the study."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.MESSAGES,
        position: "top",
        onBeforeStep: async () => {
          actions[SETUP_TOUR_STEP_IDS.MESSAGES]?.();
          await waitForElement(SETUP_TOUR_STEP_IDS.MESSAGES);
        },
      },
      {
        content: (
          <TourContent
            title="Save Your Progress"
            description="Don't forget to save your changes! The indicator will show when you have unsaved changes."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.SAVE,
        position: isMobile ? "bottom" : "left",
      },
      {
        content: (
          <TourContent
            title="Preview Your Study"
            description="Test your study by previewing it before launching to ensure everything works as expected."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.PREVIEW,
        position: isMobile ? "bottom" : "left",
      },
      {
        content: (
          <TourContent
            title="View Results"
            description="When your study is active like this, you will see this button instead of Launch."
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.RESULTS,
        position: isMobile ? "bottom" : "left",
      },
      {
        // Final- delete button setup is done
        content: (
          <TourContent
            title="And that's it!"
            description="You can delete this sample study and create your own tree test study now. Happy testing!"
          />
        ),
        selectorId: SETUP_TOUR_STEP_IDS.DELETE,
        position: isMobile ? "bottom" : "left",
      },
    ];

    return baseSteps;
  }, [isMobile, actions]);

  useEffect(() => {
    setSteps(steps);
    const timer = setTimeout(() => {
      setOpenTour(true);
      setTourStarted(true);
    }, 500); // Increased delay to ensure elements are rendered

    return () => clearTimeout(timer);
  }, [setSteps, steps]);

  // Wrap onComplete to ensure it only fires when tour actually started
  const handleTourComplete = () => {
    if (tourStarted && onComplete) {
      onComplete();
    }
  };

  return (
    <TourAlertDialog
      isOpen={openTour}
      setIsOpen={setOpenTour}
      autoStart={true}
      onComplete={handleTourComplete}
    />
  );
}
