"use client";

import { AnimatePresence, motion } from "motion/react";
import React from "react";
import Image from "next/image";
import LogoIcon from "@/assets/icons/icon-transparent.svg";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  content: React.ReactNode;
  selectorId: string;
  width?: number;
  height?: number;
  onClickWithinArea?: () => void;
  onBeforeStep?: () => void | Promise<void>; // Called before navigating to this step
  onAfterStep?: () => void | Promise<void>; // Called after navigating to this step
  position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  endTour: () => void;
  isActive: boolean;
  startTour: () => void;
  setSteps: (steps: TourStep[]) => void;
  steps: TourStep[];
  isTourCompleted: boolean;
  setIsTourCompleted: (completed: boolean) => void;
  updateElementPosition: () => void;
}

interface TourProviderProps {
  children: React.ReactNode;
  onComplete?: () => void;
  className?: string;
  isTourCompleted?: boolean;
  autoStart?: boolean; // Auto-start the tour without showing the dialog
}

const TourContext = createContext<TourContextType | null>(null);

const PADDING = 16;
const CONTENT_WIDTH = 300;
const CONTENT_HEIGHT = 240;

function getElementPosition(id: string) {
  const element = document.getElementById(id);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

function calculateContentPosition(
  elementPos: { top: number; left: number; width: number; height: number },
  position: "top" | "bottom" | "left" | "right" = "bottom"
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const contentWidth = Math.min(CONTENT_WIDTH, viewportWidth - PADDING * 2);

  let left = elementPos.left;
  let top = elementPos.top;

  switch (position) {
    case "top":
      top = elementPos.top - CONTENT_HEIGHT - PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "bottom":
      top = elementPos.top + elementPos.height + PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "left":
      left = elementPos.left - contentWidth - PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
    case "right":
      left = elementPos.left + elementPos.width + PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
  }

  return {
    top: Math.max(
      window.scrollY + PADDING,
      Math.min(top, window.scrollY + viewportHeight - CONTENT_HEIGHT - PADDING)
    ),
    left: Math.max(
      window.scrollX + PADDING,
      Math.min(left, window.scrollX + viewportWidth - contentWidth - PADDING)
    ),
    width: contentWidth,
    height: CONTENT_HEIGHT,
  };
}

export function TourProvider({
  children,
  onComplete,
  className,
  isTourCompleted = false,
  autoStart = false, // eslint-disable-line @typescript-eslint/no-unused-vars
}: TourProviderProps) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [elementPosition, setElementPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isCompleted, setIsCompleted] = useState(isTourCompleted);
  const [documentHeight, setDocumentHeight] = useState<number>(0);

  useEffect(() => {
    if (currentStep < 0) return;
    document.getElementById(steps[currentStep]?.selectorId ?? "")?.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
  }, [currentStep, steps]);

  const updateElementPosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length) {
      const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
      if (position) {
        setElementPosition(position);
      }
    }
    setDocumentHeight(document.body.scrollHeight);
  }, [currentStep, steps]);

  useEffect(() => {
    updateElementPosition();
    window.addEventListener("resize", updateElementPosition);
    window.addEventListener("scroll", updateElementPosition);

    return () => {
      window.removeEventListener("resize", updateElementPosition);
      window.removeEventListener("scroll", updateElementPosition);
    };
  }, [updateElementPosition]);

  const nextStep = useCallback(async () => {
    const currentStepIndex = currentStep;
    const nextStepIndex = currentStepIndex + 1;

    // If we're finishing the tour
    if (currentStepIndex === steps.length - 1) {
      setCurrentStep(-1);
      setIsCompleted(true);
      onComplete?.();
      return;
    }

    // If there's a next step
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];

      // Call onBeforeStep callback if it exists
      if (nextStep.onBeforeStep) {
        await nextStep.onBeforeStep();
      }

      // Move to next step
      setCurrentStep(nextStepIndex);

      // Wait a bit for DOM to update, then call onAfterStep
      setTimeout(async () => {
        if (nextStep.onAfterStep) {
          await nextStep.onAfterStep();
        }
      }, 100);
    }
  }, [steps, currentStep, onComplete, setIsCompleted]);

  const previousStep = useCallback(() => {
    // Call onBeforeStep of the previous step if it exists
    const prevStep = currentStep > 0 ? steps[currentStep - 1] : null;
    if (prevStep?.onBeforeStep) {
      prevStep.onBeforeStep();
    }
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, [currentStep, steps]);

  const endTour = useCallback(() => {
    setCurrentStep(-1);
    setIsCompleted(true);
  }, []);

  const startTour = useCallback(() => {
    if (isTourCompleted) {
      return;
    }
    setCurrentStep(0);
  }, [isTourCompleted]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (currentStep >= 0 && elementPosition) {
        const clickX = e.clientX + window.scrollX;
        const clickY = e.clientY + window.scrollY;

        const isWithinBounds =
          clickX >= elementPosition.left &&
          clickX <= elementPosition.left + (steps[currentStep]?.width || elementPosition.width) &&
          clickY >= elementPosition.top &&
          clickY <= elementPosition.top + (steps[currentStep]?.height || elementPosition.height);

        if (isWithinBounds) {
          // Execute the tour step's onClickWithinArea if it exists
          if (steps[currentStep]?.onClickWithinArea) {
            steps[currentStep].onClickWithinArea?.();
          }
        }
      }
    },
    [currentStep, elementPosition, steps]
  );

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [handleClick]);

  const setIsTourCompleted = useCallback((completed: boolean) => {
    setIsCompleted(completed);
  }, []);

  return (
    <TourContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        nextStep,
        previousStep,
        endTour,
        isActive: currentStep >= 0,
        startTour,
        setSteps,
        steps,
        isTourCompleted: isCompleted,
        setIsTourCompleted,
        updateElementPosition,
      }}
    >
      {children}
      <AnimatePresence>
        {currentStep >= 0 && elementPosition && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-50 overflow-hidden bg-black/50"
              style={{
                height: `${documentHeight}px`,
                clipPath: `polygon(
                  0% 0%,                                                                          /* top-left */
                  0% 100%,                                                                        /* bottom-left */
                  100% 100%,                                                                      /* bottom-right */
                  100% 0%,                                                                        /* top-right */
                  
                  /* Create rectangular hole */
                  ${elementPosition.left}px 0%,                                                   /* top edge start */
                  ${elementPosition.left}px ${elementPosition.top}px,                             /* hole top-left */
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top}px,  /* hole top-right */
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,  /* hole bottom-right */
                  ${elementPosition.left}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,  /* hole bottom-left */
                  ${elementPosition.left}px 0%                                                    /* back to top edge */
                )`,
              }}
            />
            {/* Blocking rectangles - covers areas outside the highlighted element */}
            {/* Top rectangle */}
            <div
              className="absolute z-[49]"
              style={{
                top: 0,
                left: 0,
                width: "100%",
                height: elementPosition.top,
                pointerEvents: "all",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />

            {/* Bottom rectangle */}
            <div
              className="absolute z-[49]"
              style={{
                top: elementPosition.top + (steps[currentStep]?.height || elementPosition.height),
                left: 0,
                width: "100%",
                height:
                  documentHeight -
                  (elementPosition.top + (steps[currentStep]?.height || elementPosition.height)),
                pointerEvents: "all",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />

            {/* Left rectangle */}
            <div
              className="absolute z-[49]"
              style={{
                top: elementPosition.top,
                left: 0,
                width: elementPosition.left,
                height: steps[currentStep]?.height || elementPosition.height,
                pointerEvents: "all",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />

            {/* Right rectangle */}
            <div
              className="absolute z-[49]"
              style={{
                top: elementPosition.top,
                left: elementPosition.left + (steps[currentStep]?.width || elementPosition.width),
                width: `calc(100% - ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px)`,
                height: steps[currentStep]?.height || elementPosition.height,
                pointerEvents: "all",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: "absolute",
                top: elementPosition.top,
                left: elementPosition.left,
                width: steps[currentStep]?.width || elementPosition.width,
                height: steps[currentStep]?.height || elementPosition.height,
              }}
              className={cn("z-[100] border-2 border-muted-foreground", className)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, top: 50, right: 50 }}
              animate={{
                opacity: 1,
                y: 0,
                top: calculateContentPosition(elementPosition, steps[currentStep]?.position).top,
                left: calculateContentPosition(elementPosition, steps[currentStep]?.position).left,
              }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: 0.4 },
              }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: "absolute",
                width: calculateContentPosition(elementPosition, steps[currentStep]?.position)
                  .width,
              }}
              className="relative z-[100] rounded-lg border bg-background p-4 shadow-lg"
            >
              <div className="absolute right-4 top-4 text-xs text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </div>
              <AnimatePresence mode="wait">
                <div>
                  <motion.div
                    key={`tour-content-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    className="overflow-hidden"
                    transition={{
                      duration: 0.2,
                      height: {
                        duration: 0.4,
                      },
                    }}
                  >
                    {steps[currentStep]?.content}
                  </motion.div>
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      onClick={endTour}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Skip
                    </button>
                    {currentStep > 0 && (
                      <button
                        onClick={previousStep}
                        disabled={currentStep === 0}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Previous
                      </button>
                    )}
                    <button
                      onClick={nextStep}
                      className="ml-auto text-sm font-medium text-primary hover:text-primary/90"
                    >
                      {currentStep === steps.length - 1 ? "Finish" : "Next"}
                    </button>
                  </div>
                </div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

export function TourTitle({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TourDescription({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TourMainAction({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TourSecondaryAction({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TourAlertDialog({
  isOpen,
  setIsOpen,
  children,
  autoStart = false,
  onComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children?: React.ReactNode;
  autoStart?: boolean;
  onComplete?: () => void;
}) {
  const { startTour, steps, isTourCompleted, currentStep } = useTour();

  // Auto-start effect
  React.useEffect(() => {
    if (autoStart && !isTourCompleted && steps.length > 0 && currentStep === -1) {
      // Use a small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour();
        setIsOpen(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isTourCompleted, steps.length, currentStep, startTour, setIsOpen]);

  // Handle tour completion from TourProvider
  React.useEffect(() => {
    if (isTourCompleted && onComplete) {
      onComplete();
    }
  }, [isTourCompleted, onComplete]);

  if (isTourCompleted || steps.length === 0 || currentStep > -1) {
    return null;
  }

  // If autoStart is enabled, don't show the dialog - just start the tour
  if (autoStart) {
    return null;
  }
  const handleSkip = async () => {
    setIsOpen(false);
  };

  const getChildOfType = (type: unknown) =>
    React.Children.toArray(children).find(
      (child: unknown) => React.isValidElement(child) && child.type === type
    );

  const title = getChildOfType(TourTitle);
  const description = getChildOfType(TourDescription);
  const mainAction = getChildOfType(TourMainAction);
  const secondaryAction = getChildOfType(TourSecondaryAction);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md p-6">
        <AlertDialogHeader className="flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <motion.div
              initial={{ scale: 0.7, filter: "blur(10px)" }}
              animate={{
                scale: 1,
                filter: "blur(0px)",
                y: [0, -8, 0],
                // rotate: [42, 48, 42],
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                y: {
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
              }}
            >
              <Image priority src={LogoIcon} alt="Usability Tree Logo" className="size-32" />
            </motion.div>
          </div>
          <AlertDialogTitle className="text-center text-xl font-medium">
            {title || "Welcome to UsabiliTree!"}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-center text-sm text-muted-foreground">
            {description || "Take a quick tour to learn about what to do next."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-6 space-y-3">
          <Button onClick={startTour} className="w-full">
            {mainAction || "Yes, show me around!"}
          </Button>
          <Button onClick={handleSkip} variant="ghost" className="w-full">
            {secondaryAction || "No, I'll explore myself"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
