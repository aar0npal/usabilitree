"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircledIcon, CrossCircledIcon, SearchIcon, XIcon } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import {
  getParticipants,
  Participant,
  deleteTaskResult,
  deleteParticipant,
} from "@/lib/treetest/results-actions";
import { toast } from "sonner";
import { ParticipantDetailsModal } from "./participant-details-modal";
import * as Sentry from "@sentry/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { RESULTS_TOUR_STEP_IDS } from "@/lib/constants";

interface ParticipantsTabProps {
  studyId: string;
  isOwner: boolean;
}

export function ParticipantsTab({ studyId, isOwner }: ParticipantsTabProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [deleteParticipantId, setDeleteParticipantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getParticipants(studyId)
      .then(setParticipants)
      .catch(Sentry.captureException)
      .finally(() => setLoading(false));
  }, [studyId]);

  const handleDeleteParticipant = async (participantId: string) => {
    try {
      await deleteParticipant(studyId, participantId);
      const updatedParticipants = await getParticipants(studyId);
      setParticipants(updatedParticipants);
      toast.success("Participant deleted successfully");
    } catch (error) {
      toast.error("Failed to delete participant");
      Sentry.captureException(error);
    }
  };
  const handleDeleteResult = async (taskId: string, participantId: string) => {
    try {
      await deleteTaskResult(studyId, taskId);
      const updatedParticipants = await getParticipants(studyId);
      setParticipants(updatedParticipants);
      // Update selected participant if it's the one being viewed
      if (selectedParticipant?.id === participantId) {
        const updatedParticipant = updatedParticipants.find((p) => p.id === participantId);
        if (updatedParticipant) {
          setSelectedParticipant(updatedParticipant);
        }
      }
      toast.success("Task result deleted successfully");
    } catch (error) {
      toast.error("Failed to delete task result");
      Sentry.captureException(error);
    }
  };

  const handleCloseModal = () => {
    setSelectedParticipant(null);
  };

  const handleRowClick = (participant: Participant) => {
    setSelectedParticipant(participant);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (!selectedParticipant) return;

    const sortedParticipants = filteredParticipants.sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
    );
    const currentIndex = sortedParticipants.findIndex((p) => p.id === selectedParticipant.id);

    let newIndex;
    if (direction === "prev") {
      newIndex = currentIndex - 1;
    } else {
      newIndex = currentIndex + 1;
    }

    if (newIndex >= 0 && newIndex < sortedParticipants.length) {
      setSelectedParticipant(sortedParticipants[newIndex]);
    }
  };

  const getNavigationState = () => {
    if (!selectedParticipant) return { canNavigatePrev: false, canNavigateNext: false };

    const sortedParticipants = filteredParticipants.sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
    );
    const currentIndex = sortedParticipants.findIndex((p) => p.id === selectedParticipant.id);

    return {
      canNavigatePrev: currentIndex > 0,
      canNavigateNext: currentIndex < sortedParticipants.length - 1,
    };
  };

  const filteredParticipants = participants.filter((p) => {
    const searchLower = search.toLowerCase();

    // If search is a number, only match participant numbers
    if (/^\d+$/.test(search)) {
      return `participant ${p.participantNumber}`.includes(search);
    }

    // Otherwise search across all fields
    return (
      p.id.toLowerCase().includes(searchLower) ||
      p.sessionId.toLowerCase().includes(searchLower) ||
      `participant ${p.participantNumber}`.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex h-[450px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h3 className="text-lg font-medium">No participants yet</h3>
          <p className="text-sm text-muted-foreground">
            Share your study link to start collecting results
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 space-y-4">
        <div className="relative max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search by Participant ID or Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div id={RESULTS_TOUR_STEP_IDS.PARTICIPANTS} className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-left font-medium">
                      Participant <QuestionMarkCircledIcon />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>
                        Numbers are assigned based on creation order. If a participant is deleted,
                        the remaining numbers will be updated on refresh.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-left font-medium">
                      Status <QuestionMarkCircledIcon />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>
                        <strong>Completed</strong>: Reached the completion page.
                        <br />
                        <strong>In Progress</strong>: Active within the last 4 minutes.
                        <br />
                        <strong>Abandoned</strong>: No activity for 4+ minutes and did not reach
                        completion message (e.g., answered all but never reached final page, or
                        dropped off mid-study).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Directness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants
              .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
              .map((participant) => {
                const taskStats = participant.taskResults.reduce(
                  (acc, result) => {
                    if (!result.skipped) {
                      acc.total++;
                      if (result.successful) acc.successful++;
                      if (result.directPathTaken) acc.direct++;
                    }
                    return acc;
                  },
                  { total: 0, successful: 0, direct: 0 }
                );

                const successRate =
                  taskStats.total === 0
                    ? null
                    : Math.round((taskStats.successful / taskStats.total) * 100);
                const directnessRate =
                  taskStats.total === 0
                    ? null
                    : Math.round((taskStats.direct / taskStats.total) * 100);

                return (
                  <TableRow
                    key={participant.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleRowClick(participant)}
                  >
                    <TableCell className="font-medium">
                      <div>Participant {participant.participantNumber}</div>
                      {participant.hasDuplicates && (
                        <div className="text-xs text-yellow-500">Has duplicate responses</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {participant.completedAt ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircledIcon className="h-4 w-4" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-500">
                          <CrossCircledIcon className="h-4 w-4" />
                          <span>Abandoned</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(participant.startedAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {participant.durationSeconds ? (
                        <span>{Math.round(participant.durationSeconds / 60)} min</span>
                      ) : participant.completedAt ? (
                        `${Math.round(
                          (participant.completedAt.getTime() - participant.startedAt.getTime()) /
                            1000 /
                            60
                        )} min`
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{successRate !== null ? `${successRate}%` : "-"}</TableCell>
                    <TableCell>{directnessRate !== null ? `${directnessRate}%` : "-"}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
      {selectedParticipant && (
        <ParticipantDetailsModal
          participant={selectedParticipant}
          isOpen={!!selectedParticipant}
          onClose={handleCloseModal}
          onDeleteResult={handleDeleteResult}
          onDeleteParticipant={handleDeleteParticipant}
          onNavigate={handleNavigate}
          canNavigatePrev={getNavigationState().canNavigatePrev}
          canNavigateNext={getNavigationState().canNavigateNext}
          isOwner={isOwner}
        />
      )}
      {/* Delete Participant Confirmation */}
      <AlertDialog open={!!deleteParticipantId} onOpenChange={() => setDeleteParticipantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant Results</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all results for this participant? This action cannot
              be undone. It is advisable to only delete results after you&apos;ve set the study to
              Completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteParticipantId) {
                  await handleDeleteParticipant(deleteParticipantId);
                  setDeleteParticipantId(null);
                }
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
