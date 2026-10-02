"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTasksStats, type TaskStats } from "@/lib/treetest/results-actions";
import { recalculateStudyResults } from "@/lib/treetest/actions";
import { ChevronRightIcon, CheckCircledIcon, XIcon, SearchIcon } from "@/components/icons";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PieChart } from "@/components/ui/pie-chart";
import { BoxPlot } from "@/components/ui/box-plot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Sentry from "@sentry/react";
import { RESULTS_TOUR_STEP_IDS } from "@/lib/constants";

const confidenceLevels = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Moderately Disagree" },
  { value: 3, label: "Slightly Disagree" },
  { value: 4, label: "Neutral" },
  { value: 5, label: "Slightly Agree" },
  { value: 6, label: "Moderately Agree" },
  { value: 7, label: "Strongly Agree" },
];

function StatBar({ value, margin, color }: { value: number; margin?: number; color: string }) {
  return (
    <div className="relative h-8 w-full rounded-full bg-secondary">
      <div
        className={`absolute left-0 top-0 h-full rounded-full ${color}`}
        style={{ width: `${value}%` }}
      ></div>
      {!!margin && (
        <div
          className="absolute top-0 h-full border-l-2 border-r-2 border-foreground/20"
          style={{
            left: `${Math.max(0, value - margin)}%`,
            width: `${Math.min(100, margin * 2)}%`,
          }}
        ></div>
      )}

      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground">
        {value}%
      </span>
    </div>
  );
}

function TaskBreakdownPie({
  breakdown,
  score,
}: {
  breakdown: TaskStats["stats"]["breakdown"];
  score: number;
}) {
  const data = [
    {
      name: "Direct Success",
      value: breakdown.directSuccess,
      percentage: ((breakdown.directSuccess / breakdown.total) * 100).toFixed(),
      color: "bg-green-500",
    },
    {
      name: "Indirect Success",
      value: breakdown.indirectSuccess,
      percentage: ((breakdown.indirectSuccess / breakdown.total) * 100).toFixed(),
      color: "bg-green-300",
    },
    {
      name: "Direct Fail",
      value: breakdown.directFail,
      percentage: ((breakdown.directFail / breakdown.total) * 100).toFixed(),
      color: "bg-red-500",
    },
    {
      name: "Indirect Fail",
      value: breakdown.indirectFail,
      percentage: ((breakdown.indirectFail / breakdown.total) * 100).toFixed(),
      color: "bg-red-300",
    },
    {
      name: "Direct Skip",
      value: breakdown.directSkip,
      percentage: ((breakdown.directSkip / breakdown.total) * 100).toFixed(),
      color: "bg-gray-500",
    },
    {
      name: "Indirect Skip",
      value: breakdown.indirectSkip,
      percentage: ((breakdown.indirectSkip / breakdown.total) * 100).toFixed(),
      color: "bg-gray-300",
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Task Completion Breakdown</span>
        <span className="text-sm text-muted-foreground">Total Participants: {breakdown.total}</span>
      </div>
      <div className="flex items-center justify-center gap-8">
        <div className="h-48 w-48">
          <PieChart data={data} />
        </div>
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${item.color}`} />
              <span className="text-sm">
                {item.name}: {item.percentage}% ({item.value})
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-sm font-medium">Overall Score</span>
          <span className="text-4xl font-bold">{score}%</span>
        </div>
      </div>
    </div>
  );
}

function TimeStats({
  stats,
  maxTimeLimit,
}: {
  stats: TaskStats["stats"]["time"];
  maxTimeLimit?: number | null;
}) {
  const DEFAULT_MAX_TIME = 120; // 2 minutes in seconds
  const effectiveMaxTime = maxTimeLimit || DEFAULT_MAX_TIME;

  const boxPlotData = {
    min: stats.min,
    q1: stats.q1,
    median: stats.median,
    q3: stats.q3,
    max: stats.max,
    displayMax: effectiveMaxTime,
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Time Taken Distribution</span>
        <span className="text-sm text-muted-foreground">
          min: {formatTime(stats.min)} / max: {formatTime(stats.max)}
          {stats.max > effectiveMaxTime && " (truncated)"}
        </span>
      </div>
      <BoxPlot data={boxPlotData} formatLabel={formatTime} />
      <div className="text-center text-sm text-muted-foreground">
        Median: {formatTime(stats.median)}
      </div>
    </div>
  );
}

function FirstClickedParentTable({
  parentClicks,
}: {
  parentClicks: TaskStats["stats"]["parentClicks"];
}) {
  if (parentClicks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">First-Clicked Parent Labels</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Path</TableHead>
            <TableHead>Correct First Click</TableHead>
            <TableHead className="text-right">Clicked First</TableHead>
            <TableHead className="text-right">Clicked During Task</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parentClicks.map((click, index) => (
            <TableRow key={index}>
              <TableCell>
                <Breadcrumb>
                  <BreadcrumbList>
                    {click.path
                      .split("/")
                      .filter(Boolean)
                      .map((item, i) => (
                        <BreadcrumbItem key={i}>
                          {i > 0 && <ChevronRightIcon className="h-4 w-4" />}
                          {item}
                        </BreadcrumbItem>
                      ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </TableCell>
              <TableCell>
                {click.isCorrect ? (
                  <span className="text-green-500">Yes</span>
                ) : (
                  <span className="text-red-500">No</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {click.firstClickCount} ({click.firstClickPercentage}%)
              </TableCell>
              <TableCell className="text-right">
                {click.totalClickCount} ({click.totalClickPercentage}%)
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ParticipantDestination {
  path: string;
  count: number;
  percentage: number;
}

interface ConfiguredPath extends ParticipantDestination {
  paths: {
    path: string;
    count: number;
  }[];
}

type Destination = ParticipantDestination | ConfiguredPath;

function IncorrectDestinationsTable({
  destinations,
}: {
  destinations: TaskStats["stats"]["incorrectDestinations"];
}) {
  const [showParticipantPaths, setShowParticipantPaths] = useState(false);

  if (destinations.length === 0) {
    return null;
  }

  const totalParticipants = destinations.reduce((sum, d) => sum + d.count, 0);

  // Configured view groups by the leaf each participant chose (resolved on the server);
  // participant view groups by the raw path taken
  const destinationsToShow: Destination[] = !showParticipantPaths
    ? Array.from(
        destinations
          .reduce((acc, dest) => {
            const configuredPath = dest.configuredPath;

            if (configuredPath) {
              if (!acc.has(configuredPath)) {
                acc.set(configuredPath, {
                  path: configuredPath,
                  count: 0,
                  percentage: 0,
                  paths: [],
                });
              }
              const entry = acc.get(configuredPath)!;
              entry.count += dest.count;
              entry.paths.push(dest);
            }
            return acc;
          }, new Map<string, ConfiguredPath>())
          .values()
      )
        .map((dest) => ({
          ...dest,
          percentage: Math.round((dest.count / totalParticipants) * 100),
        }))
        .sort((a, b) => b.count - a.count)
    : Array.from(
        destinations
          .reduce(
            (acc, dest) => acc.set(dest.path, (acc.get(dest.path) ?? 0) + dest.count),
            new Map<string, number>()
          )
          .entries()
      ).map(([path, count]) => ({
        path,
        count,
        percentage: Math.round((count / totalParticipants) * 100),
      }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Incorrect Destinations</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowParticipantPaths(!showParticipantPaths)}
        >
          Show {!showParticipantPaths ? "Participant" : "Configured"} Paths
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Path Taken</TableHead>
            <TableHead className="text-right"># of Participants</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinationsToShow.map((destination, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Breadcrumb>
                    <BreadcrumbList>
                      {destination.path
                        .split("/")
                        .filter(Boolean)
                        .map((item, i) => (
                          <BreadcrumbItem key={i}>
                            {i > 0 && <ChevronRightIcon className="h-4 w-4" />}
                            {item}
                          </BreadcrumbItem>
                        ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                  {/* {!showParticipantPaths &&
                    "paths" in destination &&
                    destination.paths.length > 1 && (
                      <HoverCard>
                        <HoverCardTrigger>
                          <InfoCircledIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Participant Paths</h4>
                            <div className="text-sm text-muted-foreground">
                              <div className="mb-2">
                                Includes {destination.paths.length} different paths:
                              </div>
                              <ul className="list-disc space-y-1 pl-4">
                                {destination.paths.map((path, i) => (
                                  <li key={i}>
                                    {path.path}
                                    <span className="ml-1 text-xs">
                                      ({path.count} participant{path.count > 1 ? "s" : ""})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )} */}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {destination.count} ({destination.percentage}%)
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ConfidenceRatingsTable({ ratings }: { ratings: TaskStats["stats"]["confidenceRatings"] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Confidence Ratings</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Answer</TableHead>
            <TableHead>Outcome Breakdown</TableHead>
            <TableHead className="text-right">Frequency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {confidenceLevels.map((level) => {
            const ratingData = ratings.find((r) => r.value === level.value);
            const count = ratingData?.count || 0;
            const breakdown = ratingData?.breakdown || {
              directSuccess: 0,
              directSuccessPercentage: 0,
              indirectSuccess: 0,
              indirectSuccessPercentage: 0,
              directFail: 0,
              directFailPercentage: 0,
              indirectFail: 0,
              indirectFailPercentage: 0,
              directSkip: 0,
              directSkipPercentage: 0,
              indirectSkip: 0,
              indirectSkipPercentage: 0,
            };

            const hasData = count > 0;

            // Determine which segments exist to find the last one
            const segments = [
              breakdown.directSuccess > 0 ? "directSuccess" : null,
              breakdown.indirectSuccess > 0 ? "indirectSuccess" : null,
              breakdown.directFail > 0 ? "directFail" : null,
              breakdown.indirectFail > 0 ? "indirectFail" : null,
              breakdown.directSkip > 0 ? "directSkip" : null,
              breakdown.indirectSkip > 0 ? "indirectSkip" : null,
            ].filter(Boolean);
            const lastSegment = segments[segments.length - 1];

            return (
              <TableRow key={level.value}>
                <TableCell className="align-middle">{level.label}</TableCell>
                <TableCell className="w-[400px] align-middle">
                  {hasData ? (
                    <div className="relative h-5 w-full overflow-hidden rounded-full bg-secondary">
                      {/* Stacked bar segments - order matters for proper stacking */}
                      {breakdown.directSuccess > 0 && (
                        <div
                          className="absolute left-0 top-0 h-full bg-green-500 @container/directSuccess"
                          style={{
                            ...(lastSegment === "directSuccess"
                              ? { right: 0 }
                              : { width: `${breakdown.directSuccessPercentage}%` }),
                          }}
                        >
                          {breakdown.directSuccessPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-white">
                              <span className="@[97px]/directSuccess:hidden">
                                {breakdown.directSuccess}
                              </span>
                              <span className="hidden @[97px]/directSuccess:inline">
                                {breakdown.directSuccess} ({breakdown.directSuccessPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {breakdown.indirectSuccess > 0 && (
                        <div
                          className="absolute top-0 h-full bg-green-300 @container/indirectSuccess"
                          style={{
                            left: `${breakdown.directSuccessPercentage}%`,
                            ...(lastSegment === "indirectSuccess"
                              ? { right: 0 }
                              : { width: `${breakdown.indirectSuccessPercentage}%` }),
                          }}
                        >
                          {breakdown.indirectSuccessPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-foreground">
                              <span className="@[97px]/indirectSuccess:hidden">
                                {breakdown.indirectSuccess}
                              </span>
                              <span className="hidden @[97px]/indirectSuccess:inline">
                                {breakdown.indirectSuccess} ({breakdown.indirectSuccessPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {breakdown.directFail > 0 && (
                        <div
                          className="absolute top-0 h-full bg-red-500 @container/directFail"
                          style={{
                            left: `${breakdown.directSuccessPercentage + breakdown.indirectSuccessPercentage}%`,
                            ...(lastSegment === "directFail"
                              ? { right: 0 }
                              : { width: `${breakdown.directFailPercentage}%` }),
                          }}
                        >
                          {breakdown.directFailPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-white">
                              <span className="@[97px]/directFail:hidden">
                                {breakdown.directFail}
                              </span>
                              <span className="hidden @[97px]/directFail:inline">
                                {breakdown.directFail} ({breakdown.directFailPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {breakdown.indirectFail > 0 && (
                        <div
                          className="absolute top-0 h-full bg-red-300 @container/indirectFail"
                          style={{
                            left: `${breakdown.directSuccessPercentage + breakdown.indirectSuccessPercentage + breakdown.directFailPercentage}%`,
                            ...(lastSegment === "indirectFail"
                              ? { right: 0 }
                              : { width: `${breakdown.indirectFailPercentage}%` }),
                          }}
                        >
                          {breakdown.indirectFailPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-foreground">
                              <span className="@[97px]/indirectFail:hidden">
                                {breakdown.indirectFail}
                              </span>
                              <span className="hidden @[97px]/indirectFail:inline">
                                {breakdown.indirectFail} ({breakdown.indirectFailPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {breakdown.directSkip > 0 && (
                        <div
                          className="absolute top-0 h-full bg-gray-500 @container/directSkip"
                          style={{
                            left: `${breakdown.directSuccessPercentage + breakdown.indirectSuccessPercentage + breakdown.directFailPercentage + breakdown.indirectFailPercentage}%`,
                            ...(lastSegment === "directSkip"
                              ? { right: 0 }
                              : { width: `${breakdown.directSkipPercentage}%` }),
                          }}
                        >
                          {breakdown.directSkipPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-white">
                              <span className="@[97px]/directSkip:hidden">
                                {breakdown.directSkip}
                              </span>
                              <span className="hidden @[97px]/directSkip:inline">
                                {breakdown.directSkip} ({breakdown.directSkipPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {breakdown.indirectSkip > 0 && (
                        <div
                          className="absolute top-0 h-full bg-gray-300 @container/indirectSkip"
                          style={{
                            left: `${breakdown.directSuccessPercentage + breakdown.indirectSuccessPercentage + breakdown.directFailPercentage + breakdown.indirectFailPercentage + breakdown.directSkipPercentage}%`,
                            ...(lastSegment === "indirectSkip"
                              ? { right: 0 }
                              : { width: `${breakdown.indirectSkipPercentage}%` }),
                          }}
                        >
                          {breakdown.indirectSkipPercentage >= 1 && (
                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-foreground">
                              <span className="@[97px]/indirectSkip:hidden">
                                {breakdown.indirectSkip}
                              </span>
                              <span className="hidden @[97px]/indirectSkip:inline">
                                {breakdown.indirectSkip} ({breakdown.indirectSkipPercentage}%)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No data</span>
                  )}
                </TableCell>
                <TableCell className="text-right align-middle">{count}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span className="text-xs text-muted-foreground">Direct Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-300" />
          <span className="text-xs text-muted-foreground">Indirect Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="text-xs text-muted-foreground">Direct Fail</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-300" />
          <span className="text-xs text-muted-foreground">Indirect Fail</span>
        </div>
      </div>
    </div>
  );
}

export function TasksTab({
  studyId,
  isOwner,
  onSetOpener,
}: {
  studyId: string;
  isOwner?: boolean;
  onSetOpener?: (opener: () => void) => void;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const handleRecalculate = useCallback(async () => {
    if (isRecalculating || cooldownRemaining > 0) return;
    setIsRecalculating(true);
    try {
      const result = await recalculateStudyResults(studyId);
      toast.success(`Stats recalculated (${result.updated} results updated)`);
      // Reload task data
      const data = await getTasksStats(studyId);
      setTasks(data);
      router.refresh();
      // Start 30s cooldown
      setCooldownRemaining(30);
    } catch (error) {
      toast.error("Failed to recalculate stats");
      Sentry.captureException(error);
    } finally {
      setIsRecalculating(false);
    }
  }, [studyId, isRecalculating, cooldownRemaining, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await getTasksStats(studyId);
        setTasks(data);

        // Open the first task by default
        if (data.length > 0) {
          setOpenItem(data[0]?.id || null);
        }

        // Set up the opener function for the tour
        if (onSetOpener && data.length > 0) {
          onSetOpener(() => {
            setOpenItem(data[0]?.id || null);
          });
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [studyId, onSetOpener]);

  const filteredTasks = tasks.filter((task) => {
    if (!search) return true;

    const searchLower = search.toLowerCase();

    // If search is a number, only match task numbers
    if (/^\d+$/.test(search)) {
      return `task ${tasks.indexOf(task) + 1}`.includes(search);
    }

    return (
      task.description.toLowerCase().includes(searchLower) ||
      task.expectedAnswer.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Skeleton className="h-10 w-full" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4 rounded-lg border px-6 py-4">
            {/* Task Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" /> {/* Task number */}
                <Skeleton className="h-5 w-64" /> {/* Task description */}
              </div>

              {/* Expected Answer Paths */}
              <div className="space-y-2">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" /> {/* CheckCircle icon */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-4" /> {/* Chevron */}
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4" /> {/* Chevron */}
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted p-2.5 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Click to expand/collapse task details.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search by Task Number, Description, or Expected Answer..."
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
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            onClick={handleRecalculate}
            disabled={isRecalculating || cooldownRemaining > 0}
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`} />
            {isRecalculating
              ? "Recalculating..."
              : cooldownRemaining > 0
                ? `Recalculate (${cooldownRemaining}s)`
                : "Recalculate Stats"}
          </Button>
        )}
      </div>
      <Accordion
        id={RESULTS_TOUR_STEP_IDS.TASKS}
        type="single"
        collapsible
        className="space-y-4"
        value={openItem || ""}
        onValueChange={(value) => setOpenItem(value || null)}
      >
        {filteredTasks.map((task, index) => (
          <AccordionItem
            {...(index === 0 ? { id: RESULTS_TOUR_STEP_IDS.TASKS_EXPAND } : {})}
            key={task.id}
            value={task.id}
            className="group rounded-lg border transition-all duration-200 @container data-[state=closed]:hover:border-primary/50 data-[state=closed]:hover:bg-accent/30 data-[state=closed]:hover:shadow-md"
          >
            <AccordionTrigger className="px-6 hover:no-underline [&[data-state=closed]]:pb-4">
              <div className="flex w-full flex-col items-start gap-4">
                <div className="flex w-full flex-col items-start gap-2 @sm:flex-row @sm:items-center @sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 @sm:gap-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      Task {task.index + 1}
                    </span>
                    <h3 className="font-semibold">{task.description}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {task.expectedAnswer.split(",").map((answer, answerIndex) => (
                    <div key={answerIndex} className="flex items-center gap-2">
                      <CheckCircledIcon className="h-4 w-4 text-green-500" />
                      <Breadcrumb>
                        <BreadcrumbList>
                          {answer
                            .trim()
                            .split("/")
                            .map((item, i) => (
                              <BreadcrumbItem key={i}>
                                {i > 0 && <ChevronRightIcon className="h-4 w-4" />}
                                {item}
                              </BreadcrumbItem>
                            ))}
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pt-4">
              <div className="space-y-6">
                <TaskBreakdownPie breakdown={task.stats.breakdown} score={task.stats.score} />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">
                      ±{task.stats.success.margin}% margin of error
                    </span>
                  </div>
                  <StatBar
                    value={task.stats.success.rate}
                    margin={task.stats.success.margin}
                    color="bg-green-bar"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Directness Score</span>
                    <span className="text-sm text-muted-foreground">
                      ±{task.stats.directness.margin}% margin of error
                    </span>
                  </div>
                  <StatBar
                    value={task.stats.directness.rate}
                    margin={task.stats.directness.margin}
                    color="bg-blue-bar"
                  />
                </div>
                <TimeStats stats={task.stats.time} maxTimeLimit={task.maxTimeSeconds} />
                <div className="border-t pt-4">
                  <FirstClickedParentTable parentClicks={task.stats.parentClicks} />
                </div>
                <div className="border-t pt-4">
                  <IncorrectDestinationsTable destinations={task.stats.incorrectDestinations} />
                </div>
                <div className="border-t pt-4">
                  <ConfidenceRatingsTable ratings={task.stats.confidenceRatings} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredTasks.length === 0 && (
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <h3 className="text-lg font-medium">No tasks found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
          </div>
        </div>
      )}
    </div>
  );
}
