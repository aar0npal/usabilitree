"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import {
  QuestionMarkCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { RESULTS_TOUR_STEP_IDS } from "@/lib/constants";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

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

    const currentIndex = filteredParticipants.findIndex((p) => p.id === selectedParticipant.id);

    let newIndex;
    if (direction === "prev") {
      newIndex = currentIndex - 1;
    } else {
      newIndex = currentIndex + 1;
    }

    if (newIndex >= 0 && newIndex < filteredParticipants.length) {
      const newParticipant = filteredParticipants[newIndex];
      setSelectedParticipant(newParticipant);

      // Update the page to show the new participant
      const newPage = Math.floor(newIndex / pageSize) + 1;
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    }
  };

  const getNavigationState = () => {
    if (!selectedParticipant) return { canNavigatePrev: false, canNavigateNext: false };

    const currentIndex = filteredParticipants.findIndex((p) => p.id === selectedParticipant.id);

    return {
      canNavigatePrev: currentIndex > 0,
      canNavigateNext: currentIndex < filteredParticipants.length - 1,
    };
  };

  // Memoize filtered and sorted participants
  const filteredParticipants = useMemo(() => {
    const filtered = participants.filter((p) => {
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

    // Sort by startedAt
    return filtered.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  }, [participants, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredParticipants.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex);

  // Reset to page 1 when search changes or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

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
              <TableHead>Success</TableHead>
              <TableHead>Directness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedParticipants.map((participant) => {
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
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedParticipant?.id === participant.id
                      ? "rounded-md bg-muted/70 ring-1 ring-inset ring-accent"
                      : ""
                  }`}
                  onClick={() => handleRowClick(participant)}
                >
                  <TableCell className="font-medium">
                    <div>Participant {participant.participantNumber}</div>
                    {participant.hasDuplicates && (
                      <div className="text-xs text-yellow-500">Has duplicate responses</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      if (participant.completedAt) {
                        return (
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircledIcon className="h-4 w-4" />
                            <span>Completed</span>
                          </div>
                        );
                      }

                      // Check last activity - use most recent task result or startedAt
                      // Note: createdAt is stored in microseconds, need to divide by 1000
                      const lastActivity =
                        participant.taskResults.length > 0
                          ? Math.max(
                              ...participant.taskResults.map((r) => Number(r.createdAt) / 1000)
                            )
                          : participant.startedAt.getTime();

                      const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
                      const isInProgress = lastActivity > fourMinutesAgo;

                      if (isInProgress) {
                        return (
                          <div className="flex items-center gap-2 text-blue-500">
                            <div className="h-4 w-4 animate-pulse rounded-full bg-blue-500" />
                            <span>In Progress</span>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 text-red-500">
                          <CrossCircledIcon className="h-4 w-4" />
                          <span>Abandoned</span>
                        </div>
                      );
                    })()}
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

      {/* Pagination Controls */}
      {filteredParticipants.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>of {filteredParticipants.length} participants</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <DoubleArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <DoubleArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
