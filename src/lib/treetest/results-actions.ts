"use server";

import { db } from "@/db";
import {
  participants,
  studyCollaborators,
  treeConfigs,
  treeTaskResults,
  treeTasks,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Item, ParentClickStats, TreeTestOverviewStats } from "../types/tree-test";
import { sanitizeTreeTestLink } from "../utils";

export async function getStudyOverviewStats(studyId: string): Promise<TreeTestOverviewStats> {
  try {
    // Get participant counts
    const [participantCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${participants.completedAt} is not null then 1 else 0 end)`,
      })
      .from(participants)
      .where(eq(participants.studyId, studyId));

    // Calculate completion times
    const completionTimes = await db
      .select({
        durationSeconds: participants.durationSeconds,
        completedAt: participants.completedAt,
        startedAt: participants.startedAt,
      })
      .from(participants)
      .where(and(eq(participants.studyId, studyId), sql`${participants.completedAt} is not null`));

    // Use durationSeconds when available, fall back to calculating from timestamps when not
    const times = completionTimes
      .map((t) => {
        if (t.durationSeconds !== null) {
          return t.durationSeconds;
        } else if (t.completedAt !== null && t.startedAt !== null) {
          // Calculate the difference in seconds
          return (Number(t.completedAt) - Number(t.startedAt)) / 1000;
        }
        return 0; // Fallback if all else fails
      })
      .filter((time) => time > 0) // Filter out any zero or negative values
      .sort((a, b) => a - b);
    const medianIndex = Math.floor(times.length / 2);

    // console.log("Completion times:", times);

    // Get task success and directness rates
    const [taskStats] = await db
      .select({
        successRate: sql<number>`avg(case when ${treeTaskResults.successful} = 1 then 100.0 else 0.0 end)`,
        directnessRate: sql<number>`avg(case when ${treeTaskResults.directPathTaken} = 1 then 100.0 else 0.0 end)`,
      })
      .from(treeTaskResults)
      .innerJoin(
        treeTasks,
        and(eq(treeTasks.id, treeTaskResults.taskId), eq(treeTasks.studyId, studyId))
      );

    const completionRate = (participantCounts.completed / participantCounts.total) * 100;

    return {
      totalParticipants: participantCounts.total,
      completedParticipants: participantCounts.completed,
      abandonedParticipants: participantCounts.total - participantCounts.completed,
      completionRate: Math.round(completionRate),
      medianCompletionTime: times[medianIndex] || 0,
      shortestCompletionTime: times[0] || 0,
      longestCompletionTime: times[times.length - 1] || 0,
      successRate: Math.round(taskStats?.successRate || 0),
      directnessRate: Math.round(taskStats?.directnessRate || 0),
    };
  } catch (error) {
    console.error("Failed to get study overview stats:", error);
    throw new Error("Failed to get study overview stats");
  }
}

export interface Collaborator {
  id: number;
  email: string;
  createdAt: Date;
}

export async function getStudyCollaborators(studyId: string): Promise<Collaborator[]> {
  try {
    const collaborators = await db
      .select()
      .from(studyCollaborators)
      .where(eq(studyCollaborators.studyId, studyId));

    return collaborators.map((c) => ({
      id: c.id,
      email: c.email,
      createdAt: new Date(Number(c.createdAt)),
    }));
  } catch (error) {
    console.error("Failed to get study collaborators:", error);
    throw new Error("Failed to get study collaborators");
  }
}

export async function addStudyCollaborator(studyId: string, email: string) {
  try {
    await db.insert(studyCollaborators).values({
      studyId,
      email,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to add collaborator:", error);
    throw new Error("Failed to add collaborator");
  }
}

export async function removeStudyCollaborator(collaboratorId: number) {
  try {
    await db.delete(studyCollaborators).where(eq(studyCollaborators.id, collaboratorId));
    return { success: true };
  } catch (error) {
    console.error("Failed to remove collaborator:", error);
    throw new Error("Failed to remove collaborator");
  }
}

export interface TaskStats {
  id: string;
  index: number;
  description: string;
  expectedAnswer: string;
  maxTimeSeconds: number | null;
  parsedTree: string;
  stats: {
    success: {
      rate: number;
      margin: number;
    };
    directness: {
      rate: number;
      margin: number;
    };
    time: {
      median: number;
      min: number;
      max: number;
      q1: number;
      q3: number;
    };
    score: number;
    breakdown: {
      directSuccess: number;
      indirectSuccess: number;
      directFail: number;
      indirectFail: number;
      directSkip: number;
      indirectSkip: number;
      total: number;
    };
    parentClicks: {
      path: string;
      isCorrect: boolean;
      firstClickCount: number;
      firstClickPercentage: number;
      totalClickCount: number;
      totalClickPercentage: number;
    }[];
    incorrectDestinations: {
      path: string;
      count: number;
      percentage: number;
    }[];
    confidenceRatings: {
      value: number;
      count: number;
      percentage: number;
      breakdown: {
        directSuccess: number;
        directSuccessPercentage: number;
        indirectSuccess: number;
        indirectSuccessPercentage: number;
        directFail: number;
        directFailPercentage: number;
        indirectFail: number;
        indirectFailPercentage: number;
        directSkip: number;
        directSkipPercentage: number;
        indirectSkip: number;
        indirectSkipPercentage: number;
      };
    }[];
  };
}

// Helper function to compute statistics from data (moved to client-side computation)
const computeStatistics = (
  values: number[]
): { median: number; min: number; max: number; q1: number; q3: number } => {
  if (values.length === 0) {
    return { median: 0, min: 0, max: 0, q1: 0, q3: 0 };
  }

  // Sort the values
  const sorted = [...values].sort((a, b) => a - b);

  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Calculate quartiles
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];

  return {
    median: Math.round(median),
    min: Math.round(min),
    max: Math.round(max),
    q1: Math.round(q1),
    q3: Math.round(q3),
  };
};

// OPTIMIZED VERSION - Significantly reduces database reads by fetching all data in bulk
export async function getTasksStats(studyId: string): Promise<TaskStats[]> {
  try {
    // Step 1: Get all tasks and tree config in a single query
    const tasks = await db
      .select({
        id: treeTasks.id,
        description: treeTasks.description,
        expectedAnswer: treeTasks.expectedAnswer,
        maxTimeSeconds: treeTasks.maxTimeSeconds || undefined,
        index: treeTasks.taskIndex,
        parsedTree: treeConfigs.parsedTree,
      })
      .from(treeTasks)
      .innerJoin(treeConfigs, eq(treeConfigs.studyId, treeTasks.studyId))
      .where(eq(treeTasks.studyId, studyId))
      .orderBy(treeTasks.taskIndex);

    if (tasks.length === 0) {
      return [];
    }

    // Step 2: Get all task results in a single query instead of multiple per task
    const allTaskResults = await db
      .select({
        taskId: treeTaskResults.taskId,
        successful: treeTaskResults.successful,
        directPathTaken: treeTaskResults.directPathTaken,
        completionTimeSeconds: treeTaskResults.completionTimeSeconds,
        confidenceRating: treeTaskResults.confidenceRating,
        pathTaken: treeTaskResults.pathTaken,
        skipped: treeTaskResults.skipped,
        participantId: treeTaskResults.participantId,
      })
      .from(treeTaskResults)
      .innerJoin(treeTasks, eq(treeTasks.id, treeTaskResults.taskId))
      .innerJoin(participants, eq(participants.id, treeTaskResults.participantId))
      .where(eq(treeTasks.studyId, studyId));

    // Process each task with the pre-fetched data
    const taskStats = tasks.map((task) => {
      // Filter results for this specific task
      const taskResults = allTaskResults.filter((result) => result.taskId === task.id);

      if (taskResults.length === 0) {
        return {
          ...task,
          stats: {
            success: { rate: 0, margin: 0 },
            directness: { rate: 0, margin: 0 },
            time: { median: 0, min: 0, max: 0, q1: 0, q3: 0 },
            score: 0,
            breakdown: {
              directSuccess: 0,
              indirectSuccess: 0,
              directFail: 0,
              indirectFail: 0,
              directSkip: 0,
              indirectSkip: 0,
              total: 0,
            },
            parentClicks: [],
            incorrectDestinations: [],
            confidenceRatings: [],
          },
        };
      }

      // Calculate success and directness rates
      const successCount = taskResults.filter((r) => r.successful === true).length;
      const directnessCount = taskResults.filter((r) => r.directPathTaken === true).length;
      const totalCount = taskResults.length;

      const successRate = (successCount / totalCount) * 100;
      const directnessRate = (directnessCount / totalCount) * 100;

      // Calculate margins of error (95% confidence interval)
      const successMargin = Math.sqrt((successRate * (100 - successRate)) / totalCount) * 1.96;
      const directnessMargin =
        Math.sqrt((directnessRate * (100 - directnessRate)) / totalCount) * 1.96;

      // Calculate time statistics
      const timeValues = taskResults
        .filter((r) => r.skipped === false) // Exclude skipped tasks
        .map((r) => r.completionTimeSeconds);

      const timeStats = computeStatistics(timeValues);

      // Calculate breakdown counts
      const breakdown = {
        directSuccess: taskResults.filter(
          (r) => r.successful === true && r.directPathTaken === true && r.skipped === false
        ).length,
        indirectSuccess: taskResults.filter(
          (r) => r.successful === true && r.directPathTaken === false && r.skipped === false
        ).length,
        directFail: taskResults.filter(
          (r) => r.successful === false && r.directPathTaken === true && r.skipped === false
        ).length,
        indirectFail: taskResults.filter(
          (r) => r.successful === false && r.directPathTaken === false && r.skipped === false
        ).length,
        directSkip: taskResults.filter((r) => r.skipped === true && r.directPathTaken === true)
          .length,
        indirectSkip: taskResults.filter((r) => r.skipped === true && r.directPathTaken === false)
          .length,
        total: totalCount,
      };

      // Calculate overall score (weighted average of success and directness)
      const score = Math.round(successRate * 0.7 + directnessRate * 0.3);

      // Process paths for parent click analysis
      const nonSkippedResults = taskResults.filter((r) => r.skipped === false);

      // Group non-skipped results by path
      const pathResultsMap = new Map<string, number>();
      nonSkippedResults.forEach((result) => {
        const pathTaken = result.pathTaken;
        pathResultsMap.set(pathTaken, (pathResultsMap.get(pathTaken) || 0) + 1);
      });

      const pathResults = Array.from(pathResultsMap.entries()).map(([pathTaken, count]) => ({
        pathTaken,
        count,
      }));

      const totalParticipants = nonSkippedResults.length;

      // Parse the tree to determine if "home" is the only root child
      const tree = JSON.parse(task.parsedTree) as Item[];
      const hasOnlyHomeRoot = tree.length === 1;
      // && tree[0].name.toLowerCase().includes("home");

      // First pass: collect all possible parent names
      const allParentNames = new Set<string>();
      pathResults.forEach((result) => {
        const pathParts = result.pathTaken.split("/").filter(Boolean);
        if (hasOnlyHomeRoot && pathParts.length > 1) {
          allParentNames.add(`/${pathParts[1]}`);
        } else {
          allParentNames.add(`/${pathParts[0]}`);
        }
      });

      // Process paths to get parent click statistics
      const parentClickStats = new Map<string, ParentClickStats>();
      const homeRoot = hasOnlyHomeRoot ? sanitizeTreeTestLink(tree[0].name) : "";

      pathResults.forEach((result) => {
        const expectedAnswers = task.expectedAnswer.split(",").map((answer) => answer.trim());

        const expectedParentPaths = expectedAnswers.map((answer) => {
          // If the answer is itself a top-level parent path (e.g. "/settings"), keep it as-is
          // so it isn't re-derived to a shorter ancestor and mislabeled in the table.
          // For deeper answers (e.g. "/settings/general"), derive the first-level parent.
          const expectedParts = answer.split("/").filter(Boolean);
          if (hasOnlyHomeRoot && expectedParts.length > 1) {
            // Under a single home root, the "first-level parent" is the second segment
            return `/${homeRoot}/${expectedParts[1]}`;
          }
          return `/${expectedParts[0]}`;
        });

        // For each possible parent name, check if it appears in the path
        allParentNames.forEach((possibleParentName) => {
          const parentPathForName = hasOnlyHomeRoot
            ? `/${homeRoot}${possibleParentName}`
            : possibleParentName;

          // Check if this path starts with this parent path (first click)
          const isFirstClick = result.pathTaken.startsWith(parentPathForName);

          // Check if this path includes this parent name anywhere (total clicks)
          const includesParentName = result.pathTaken.includes(possibleParentName);

          if (!parentClickStats.has(parentPathForName)) {
            parentClickStats.set(parentPathForName, {
              path: parentPathForName,
              isCorrect: expectedParentPaths.includes(parentPathForName),
              firstClickCount: isFirstClick ? result.count : 0,
              firstClickPercentage: isFirstClick
                ? Math.round((result.count / totalParticipants) * 100)
                : 0,
              totalClickCount: includesParentName ? result.count : 0,
              totalClickPercentage: includesParentName
                ? Math.round((result.count / totalParticipants) * 100)
                : 0,
            });
          } else {
            const stats = parentClickStats.get(parentPathForName)!;
            if (isFirstClick) {
              stats.firstClickCount += result.count;
              stats.firstClickPercentage = Math.round(
                (stats.firstClickCount / totalParticipants) * 100
              );
            }
            if (includesParentName) {
              stats.totalClickCount += result.count;
              stats.totalClickPercentage = Math.round(
                (stats.totalClickCount / totalParticipants) * 100
              );
            }
          }
        });
      });

      // Get incorrect destinations
      const incorrectResults = taskResults.filter(
        (r) => r.successful === false && r.skipped === false
      );

      // Group incorrect results by path
      const incorrectDestinationsMap = new Map<string, number>();
      incorrectResults.forEach((result) => {
        const pathTaken = result.pathTaken;
        incorrectDestinationsMap.set(pathTaken, (incorrectDestinationsMap.get(pathTaken) || 0) + 1);
      });

      const totalIncorrect = incorrectResults.length;

      const incorrectDestinations = Array.from(incorrectDestinationsMap.entries()).map(
        ([path, count]) => ({
          path,
          count,
          percentage: totalIncorrect ? Math.round((count / totalIncorrect) * 100) : 0,
        })
      );

      // Get confidence ratings distribution with outcome breakdown
      const confidenceValuesMap = new Map<
        number,
        {
          count: number;
          directSuccess: number;
          indirectSuccess: number;
          directFail: number;
          indirectFail: number;
          directSkip: number;
          indirectSkip: number;
        }
      >();

      taskResults.forEach((result) => {
        if (result.confidenceRating !== null) {
          const value = Number(result.confidenceRating);

          if (!confidenceValuesMap.has(value)) {
            confidenceValuesMap.set(value, {
              count: 0,
              directSuccess: 0,
              indirectSuccess: 0,
              directFail: 0,
              indirectFail: 0,
              directSkip: 0,
              indirectSkip: 0,
            });
          }

          const stats = confidenceValuesMap.get(value)!;
          stats.count++;

          // Categorize the result
          if (result.skipped) {
            if (result.directPathTaken) {
              stats.directSkip++;
            } else {
              stats.indirectSkip++;
            }
          } else if (result.successful) {
            if (result.directPathTaken) {
              stats.directSuccess++;
            } else {
              stats.indirectSuccess++;
            }
          } else {
            if (result.directPathTaken) {
              stats.directFail++;
            } else {
              stats.indirectFail++;
            }
          }
        }
      });

      const totalRatings = Array.from(confidenceValuesMap.values()).reduce(
        (sum, stats) => sum + stats.count,
        0
      );

      const confidenceRatings = Array.from(confidenceValuesMap.entries()).map(([value, stats]) => ({
        value,
        count: stats.count,
        percentage: totalRatings ? Math.round((stats.count / totalRatings) * 100) : 0,
        breakdown: {
          directSuccess: stats.directSuccess,
          directSuccessPercentage: stats.count
            ? Math.round((stats.directSuccess / stats.count) * 100)
            : 0,
          indirectSuccess: stats.indirectSuccess,
          indirectSuccessPercentage: stats.count
            ? Math.round((stats.indirectSuccess / stats.count) * 100)
            : 0,
          directFail: stats.directFail,
          directFailPercentage: stats.count
            ? Math.round((stats.directFail / stats.count) * 100)
            : 0,
          indirectFail: stats.indirectFail,
          indirectFailPercentage: stats.count
            ? Math.round((stats.indirectFail / stats.count) * 100)
            : 0,
          directSkip: stats.directSkip,
          directSkipPercentage: stats.count
            ? Math.round((stats.directSkip / stats.count) * 100)
            : 0,
          indirectSkip: stats.indirectSkip,
          indirectSkipPercentage: stats.count
            ? Math.round((stats.indirectSkip / stats.count) * 100)
            : 0,
        },
      }));

      return {
        ...task,
        stats: {
          success: {
            rate: Math.round(successRate),
            margin: Math.round(successMargin),
          },
          directness: {
            rate: Math.round(directnessRate),
            margin: Math.round(directnessMargin),
          },
          time: timeStats,
          score,
          breakdown,
          parentClicks: Array.from(parentClickStats.values()).sort(
            (a, b) => b.firstClickCount - a.firstClickCount
          ),
          incorrectDestinations,
          confidenceRatings,
        },
      };
    });

    return taskStats;
  } catch (error) {
    console.error("Failed to get tasks stats:", error);
    throw new Error("Failed to get tasks stats");
  }
}

export interface Participant {
  id: string;
  sessionId: string;
  startedAt: Date;
  durationSeconds: number | null;
  completedAt: Date | null;
  taskResults: {
    id: string;
    taskId: string;
    successful: boolean;
    directPathTaken: boolean;
    completionTimeSeconds: number;
    pathTaken: string;
    taskIndex: number;
    description: string;
    skipped: boolean;
    confidenceRating: number | null;
    createdAt: Date;
  }[];
  hasDuplicates: boolean;
  participantNumber: number;
  // totalDuration: number;
}

export async function getParticipants(studyId: string): Promise<Participant[]> {
  try {
    const studyParticipants = await db
      .select({
        id: participants.id,
        sessionId: participants.sessionId,
        startedAt: participants.startedAt,
        durationSeconds: participants.durationSeconds,
        completedAt: participants.completedAt,
      })
      .from(participants)
      .where(eq(participants.studyId, studyId));

    const participantsWithResults = await Promise.all(
      studyParticipants.map(async (participant, index) => {
        const results = await db
          .select({
            id: treeTaskResults.id,
            taskId: treeTaskResults.taskId,
            successful: treeTaskResults.successful,
            directPathTaken: treeTaskResults.directPathTaken,
            completionTimeSeconds: treeTaskResults.completionTimeSeconds,
            pathTaken: treeTaskResults.pathTaken,
            skipped: treeTaskResults.skipped,
            confidenceRating: treeTaskResults.confidenceRating,
            taskIndex: treeTasks.taskIndex,
            description: treeTasks.description,
            createdAt: treeTaskResults.createdAt,
          })
          .from(treeTaskResults)
          .innerJoin(treeTasks, eq(treeTasks.id, treeTaskResults.taskId))
          .where(eq(treeTaskResults.participantId, participant.id));

        // Group results by taskIndex to identify duplicates
        const groupedResults = results.reduce(
          (acc, result) => {
            // Initialize an array for the taskIndex if it doesn't exist
            if (!acc[result.taskIndex]) {
              acc[result.taskIndex] = [];
            }
            // Add the result to the corresponding taskIndex group
            acc[result.taskIndex].push(result);
            return acc;
          },
          {} as Record<number, typeof results>
        );

        // Sum of all taskResults completionTimeSeconds
        // const totalDuration = results.reduce(
        //   (sum, result) => sum + result.completionTimeSeconds,
        //   0
        // );

        return {
          ...participant,
          taskResults: results,
          // totalDuration,
          hasDuplicates: Object.values(groupedResults).some((group) => group.length > 1),
          participantNumber: index + 1,
        };
      })
    );

    return participantsWithResults;
  } catch (error) {
    console.error("Failed to fetch participants:", error);
    throw new Error("Failed to fetch participants");
  }
}

export async function deleteTaskResult(taskId: string): Promise<void> {
  try {
    await db.delete(treeTaskResults).where(eq(treeTaskResults.id, taskId));
  } catch (error) {
    console.error("Failed to delete task result:", error);
    throw new Error("Failed to delete task result");
  }
}

export async function deleteParticipant(participantId: string): Promise<void> {
  try {
    await db.delete(participants).where(eq(participants.id, participantId));
  } catch (error) {
    console.error("Failed to delete participant:", error);
    throw new Error("Failed to delete participant");
  }
}
