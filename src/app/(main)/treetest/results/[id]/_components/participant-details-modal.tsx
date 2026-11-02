"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@/components/icons";
import { format } from "date-fns";
import { Fragment, useState, useEffect, useCallback } from "react";
import { Participant } from "@/lib/treetest/results-actions";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

interface ParticipantDetailsProps {
  participant: Participant;
  isOpen: boolean;
  onClose: () => void;
  onDeleteResult: (taskId: string, participantId: string) => Promise<void>;
  onDeleteParticipant: (participantId: string) => Promise<void>;
  onNavigate: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  isOwner: boolean;
}

export function ParticipantDetailsModal({
  participant,
  isOpen,
  onClose,
  onDeleteResult,
  onDeleteParticipant,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  isOwner,
}: ParticipantDetailsProps) {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [showDeleteParticipantDialog, setShowDeleteParticipantDialog] = useState(false);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't navigate if a dialog is open or user is typing
      if (deleteTaskId || showDeleteParticipantDialog) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" && canNavigatePrev) {
        e.preventDefault();
        onNavigate("prev");
      } else if (e.key === "ArrowRight" && canNavigateNext) {
        e.preventDefault();
        onNavigate("next");
      }
    },
    [canNavigatePrev, canNavigateNext, onNavigate, deleteTaskId, showDeleteParticipantDialog]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleClose = () => {
    // Clean up any pending delete state
    setDeleteTaskId(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="flex max-h-[90vh] max-w-6xl flex-col gap-0 p-0"
          onOpenAutoFocus={(event) => event.preventDefault()} // fix to Tooltip automatically appearing
          onCloseAutoFocus={(event) => event.preventDefault()} // prevent focus issues when closing
        >
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2 pr-9">
            <DialogTitle>Participant {participant.participantNumber} Details</DialogTitle>
            <div className="mt-0 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate("prev")}
                        disabled={!canNavigatePrev}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Previous participant (←)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate("next")}
                        disabled={!canNavigateNext}
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Next participant (→)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isOwner && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteParticipantDialog(true)}
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 [scrollbar-gutter:stable]">
            <div className="space-y-6">
              {/* Participant Info */}
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_0.5fr_1.5fr]">
                  <div>
                    <p className="text-sm text-muted-foreground">Participant ID</p>
                    <p className="font-mono text-sm">{participant.id}</p>
                  </div>
                  <div>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-left">
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              Duration <QuestionMarkCircledIcon />
                            </p>
                            <p className="text-sm">
                              {participant.durationSeconds
                                ? `${participant.durationSeconds}s`
                                : "N/A"}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p>
                            The total active time of the user from the moment they visited the task
                            page (not the welcome nor the instruction page) until they completed it.
                            This isn&apos;t the sum of all their tasks time as you can see in the
                            table.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <div>Started {format(participant.startedAt, "MMM d, pp")}</div>
                      {participant.completedAt ? (
                        <div className="text-green-600">
                          Completed {format(participant.completedAt, "MMM d, pp")}
                        </div>
                      ) : (
                        <div className="text-red-500">Not completed</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Task Results Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-left font-medium">
                              Task <QuestionMarkCircledIcon />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>
                                T = Task number, A = Attempt number (if multiple attempts for the
                                same task). If you see duplicate responses, you can delete the
                                subsequent attempts. This may occur due to participants experiencing
                                connectivity issues during the study.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Path Taken</TableHead>
                      <TableHead>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-left font-medium">
                              Confidence <QuestionMarkCircledIcon />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Participant&apos;s confidence level in their answer (1-7 scale)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-left font-medium">
                              Time <QuestionMarkCircledIcon />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>
                                This is the duration from the moment they clicked the button
                                &quot;Start task&quot;
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(
                      participant.taskResults.reduce(
                        (acc, result) => {
                          if (!acc[result.taskIndex]) {
                            acc[result.taskIndex] = [];
                          }
                          acc[result.taskIndex].push(result);
                          return acc;
                        },
                        {} as Record<number, typeof participant.taskResults>
                      )
                    )
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([taskIndex, results]) => (
                        <Fragment key={taskIndex}>
                          {results.map((result, attemptIndex) => (
                            <TableRow key={result.id}>
                              <TableCell>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-medium">T{result.taskIndex + 1}</span>
                                        {results.length > 1 && (
                                          <span className="text-sm text-purple-500">
                                            (A{attemptIndex + 1})
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <p className="max-w-xs">{result.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>
                                {result.skipped ? (
                                  <div className="flex items-center gap-2 text-yellow-500">
                                    <CrossCircledIcon className="h-4 w-4" />
                                    <span>Skipped</span>
                                  </div>
                                ) : result.successful ? (
                                  result.directPathTaken ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                      <CheckCircledIcon className="h-4 w-4" />
                                      <span>Direct Success</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-green-500">
                                      <CheckCircledIcon className="h-4 w-4" />
                                      <span>Indirect Success</span>
                                    </div>
                                  )
                                ) : result.directPathTaken ? (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <CrossCircledIcon className="h-4 w-4" />
                                    <span>Direct Fail</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-red-500">
                                    <CrossCircledIcon className="h-4 w-4" />
                                    <span>Indirect Fail</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {result.pathTaken || "-"}
                              </TableCell>
                              <TableCell>
                                {result.confidenceRating ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm">{result.confidenceRating}/7</span>
                                    <span className="text-xs text-muted-foreground">
                                      {result.confidenceRating <= 2
                                        ? "Low"
                                        : result.confidenceRating <= 4
                                          ? "Neutral"
                                          : result.confidenceRating <= 5
                                            ? "Moderate"
                                            : "High"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{result.completionTimeSeconds}s</TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {format(new Date(Number(result.createdAt) / 1000), "PP p")}
                              </TableCell>
                              <TableCell>
                                {isOwner ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTaskId(result.id)}
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Result Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task result? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTaskId) {
                  await onDeleteResult(deleteTaskId, participant.id);
                  setDeleteTaskId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Participant Confirmation */}
      <AlertDialog open={showDeleteParticipantDialog} onOpenChange={setShowDeleteParticipantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              It is advisable to delete participant data <b>only if</b> they were test participants
              or if the study is completed. The participant may come back to complete the study
              later.
              <br />
              <br />
              Are you sure you want to delete all results for Participant{" "}
              {participant.participantNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await onDeleteParticipant(participant.id);
                setShowDeleteParticipantDialog(false);
                onClose();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
