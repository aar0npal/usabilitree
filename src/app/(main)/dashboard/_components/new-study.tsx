"use client";

import { motion } from "framer-motion";
import { FilePlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreemCheckout } from "@creem_io/nextjs";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { createStudy } from "@/lib/treetest/actions";
import { createSampleTreeTestStudy } from "@/lib/treetest/sample-actions";
import * as Sentry from "@sentry/react";
import { CREEM_API } from "@/lib/constants";
import { STUDIES_PER_PURCHASE } from "@/lib/billing/study-limit";
import { usePostHog } from "posthog-js/react";

const MotionButton = motion.create(Button);

interface NewPostProps {
  isEligible: boolean;
  userId: string;
  studyLimit: number;
  studyCount: number;
  creemProductId?: string;
  index?: number;
}

export const NewStudy = ({
  isEligible,
  userId,
  studyLimit,
  studyCount,
  creemProductId,
  index = 0,
}: NewPostProps) => {
  const router = useRouter();
  const [isCreatePending, startCreateTransaction] = React.useTransition();
  const [showTypeDialog, setShowTypeDialog] = React.useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);

  const handleClick = () => {
    if (!isEligible) {
      setShowUpgradeDialog(true);
      return;
    }
    setShowTypeDialog(true);
  };

  const createPost = (type: "tree_test" | "card_sort" | "sample_tree_test") => {
    startCreateTransaction(async () => {
      try {
        let result;
        if (type === "sample_tree_test") {
          result = await createSampleTreeTestStudy();
          toast.success("Sample study created successfully. Please wait for setup to load.");
        } else {
          result = await createStudy(type);
          toast.success("Study created successfully");
        }

        if (type === "tree_test" || type === "sample_tree_test") {
          router.push(`/treetest/setup/${result.id}`);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        const limitReached =
          error instanceof Error &&
          (error.name === "ForbiddenError" || error.message === "Study limit reached");
        if (limitReached) {
          toast.error("Study limit reached");
          setShowUpgradeDialog(true);
        } else {
          toast.error("Failed to create study");
        }
        Sentry.captureException(error);
      }
    });
  };

  return (
    <>
      <MotionButton
        onClick={handleClick}
        className="flex h-full cursor-pointer items-center justify-center bg-card p-6 text-muted-foreground transition-colors hover:bg-secondary/10 dark:border-none dark:bg-secondary/30 dark:hover:bg-secondary/50"
        disabled={isCreatePending}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
      >
        <div className="flex flex-col items-center gap-4">
          <FilePlusIcon className="h-10 w-10" />
          <p className="text-sm">New Study</p>
        </div>
      </MotionButton>

      <StudyTypeDialog
        open={showTypeDialog}
        onOpenChange={setShowTypeDialog}
        onSelect={(type) => {
          setShowTypeDialog(false);
          createPost(type);
        }}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        userId={userId}
        studyLimit={studyLimit}
        studyCount={studyCount}
        creemProductId={creemProductId}
      />
    </>
  );
};

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  studyLimit: number;
  studyCount: number;
  creemProductId?: string;
}

function UpgradeDialog({
  open,
  onOpenChange,
  userId,
  studyLimit,
  studyCount,
  creemProductId,
}: UpgradeDialogProps) {
  const posthog = usePostHog();

  const handleCheckoutInitiated = () => {
    sessionStorage.setItem("pre_checkout_study_limit", String(studyLimit));

    posthog?.capture("starter_pack_checkout_clicked", {
      entry_point: "new_study_upgrade_dialog",
      studies_per_pack: STUDIES_PER_PURCHASE,
      price_usd: 5,
      study_limit_before: studyLimit,
      study_count_before: studyCount,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Study Limit Reached</DialogTitle>
          <DialogDescription>
            You&apos;ve used {studyCount} of {studyLimit} studies. Get {STUDIES_PER_PURCHASE} more
            for a one-time $5 payment.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">+{STUDIES_PER_PURCHASE} Studies</p>
              <p className="text-sm text-muted-foreground">
                Stackable &mdash; buy as many times as you need
              </p>
            </div>
            <span className="text-xl font-bold">$5</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {creemProductId ? (
            <CreemCheckout
              checkoutPath={CREEM_API.checkout}
              productId={creemProductId}
              referenceId={userId}
              successUrl="/dashboard/billing"
            >
              <Button onClick={handleCheckoutInitiated}>
                Get {STUDIES_PER_PURCHASE} More Studies &mdash; $5
              </Button>
            </CreemCheckout>
          ) : (
            <Button disabled title="Set NEXT_PUBLIC_CREEM_PRODUCT_ID">
              Checkout unavailable
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StudyTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "tree_test" | "card_sort" | "sample_tree_test") => void;
}

function StudyTypeDialog({ open, onOpenChange, onSelect }: StudyTypeDialogProps) {
  const [selectedType, setSelectedType] = React.useState<
    "tree_test" | "card_sort" | "sample_tree_test"
  >("tree_test");

  const studyTypes = [
    {
      id: "tree_test",
      title: "Tree Test",
      description: "Evaluate the information architecture and findability of your website or app",
      available: true,
    },
    {
      id: "card_sort",
      title: "Card Sort",
      description: "Understand how users categorize and organize information",
      available: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Study Type</DialogTitle>
          <DialogDescription>Select the type of study you want to create.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {studyTypes.map((study) => (
            <Card
              key={study.id}
              className={`cursor-pointer transition-all duration-150 ease-out ${
                selectedType === study.id
                  ? "border-primary/60 bg-primary/5"
                  : study.available
                    ? "border-black/10 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:border-black/20"
                    : "cursor-not-allowed border-black/5 bg-gray-50/50 opacity-60"
              }`}
              onClick={() =>
                study.available && setSelectedType(study.id as "tree_test" | "card_sort")
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium">{study.title}</h3>
                      {!study.available && (
                        <Badge variant="secondary" className="text-xs">
                          Not Available
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{study.description}</p>
                  </div>
                  {selectedType === study.id && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onSelect(selectedType)}>Create Study</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
