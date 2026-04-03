import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participants, studies, treeTaskResults, treeTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth/session";
import { createRouteLogger } from "@/lib/posthog/server-logs";

const confidenceLevels = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Moderately Disagree" },
  { value: 3, label: "Slightly Disagree" },
  { value: 4, label: "Neutral" },
  { value: 5, label: "Slightly Agree" },
  { value: 6, label: "Moderately Agree" },
  { value: 7, label: "Strongly Agree" },
];

function getConfidenceLabel(value: number | null): string {
  if (value === null) return "";
  const level = confidenceLevels.find((level) => level.value === value);
  return level ? level.label : "";
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatTimestamp(timestamp: Date | number | null): string {
  if (timestamp === null) return "";

  // Handle both Date objects and Unix timestamps (in milliseconds or seconds)
  let date: Date;
  if (typeof timestamp === "number") {
    // If the number is less than a reasonable threshold, assume it's in seconds (Unix timestamp)
    // Otherwise assume it's already in milliseconds
    date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  } else {
    date = timestamp;
  }

  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");
}

function getTaskOutcome(successful: boolean, directPathTaken: boolean, skipped: boolean): string {
  if (skipped) return "Skip";
  if (successful && directPathTaken) return "Direct Success";
  if (successful && !directPathTaken) return "Indirect Success";
  if (!successful && directPathTaken) return "Direct Fail";
  if (!successful && !directPathTaken) return "Indirect Fail";
  return "Unknown";
}

function sanitizeFilename(title: string): string {
  // Normalize accented characters to basic Latin characters
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove diacritical marks

  // Replace spaces with hyphens and remove/replace special characters
  return normalized
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w-]/g, "") // Remove special characters except word chars and hyphens
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length to 50 characters
}

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest, { params }: { params: { studyId: string } }) {
  const routeLogger = createRouteLogger("/api/export/[studyId]", "GET", request);
  routeLogger.flush();

  try {
    routeLogger.info("Study export requested", {
      study_id: params.studyId,
    });

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      routeLogger.warn("Unauthorized study export request", {
        study_id: params.studyId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studyId = params.studyId;

    // Get study information
    const [study] = await db
      .select({
        title: studies.title,
      })
      .from(studies)
      .where(eq(studies.id, studyId));

    if (!study) {
      routeLogger.warn("Study export requested for missing study", {
        study_id: studyId,
      });
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // Get all participants for this study
    const studyParticipants = await db
      .select({
        id: participants.id,
        sessionId: participants.sessionId,
        startedAt: participants.startedAt,
        completedAt: participants.completedAt,
        durationSeconds: participants.durationSeconds,
      })
      .from(participants)
      .where(eq(participants.studyId, studyId))
      .orderBy(participants.startedAt);

    // Get all tasks for this study
    const tasks = await db
      .select({
        id: treeTasks.id,
        taskIndex: treeTasks.taskIndex,
        description: treeTasks.description,
        expectedAnswer: treeTasks.expectedAnswer,
      })
      .from(treeTasks)
      .where(eq(treeTasks.studyId, studyId))
      .orderBy(treeTasks.taskIndex);

    // Get all task results for all participants
    const allTaskResults = await db
      .select({
        participantId: treeTaskResults.participantId,
        taskId: treeTaskResults.taskId,
        successful: treeTaskResults.successful,
        directPathTaken: treeTaskResults.directPathTaken,
        completionTimeSeconds: treeTaskResults.completionTimeSeconds,
        confidenceRating: treeTaskResults.confidenceRating,
        pathTaken: treeTaskResults.pathTaken,
        skipped: treeTaskResults.skipped,
      })
      .from(treeTaskResults)
      .innerJoin(treeTasks, eq(treeTasks.id, treeTaskResults.taskId))
      .where(eq(treeTasks.studyId, studyId));

    // Build the Excel data
    const excelData: (string | number)[][] = [];

    // Create headers
    const headers: string[] = [
      "Participant ID",
      "Status",
      "Start Time (UTC)",
      "End Time (UTC)",
      "Time Taken",
      "Tasks Completed (%)",
      "Tasks Skipped (%)",
      "Tasks Successful (%)",
      "Path Directness (%)",
    ];

    // Add task-specific headers
    tasks.forEach((task) => {
      headers.push(`Task ${task.taskIndex + 1} Path Taken`);
      headers.push(`Task ${task.taskIndex + 1} Path Outcome`);
      headers.push(`Task ${task.taskIndex + 1}: How confident are you with your answer?`);
      headers.push(`Task ${task.taskIndex + 1} Confidence Label`);
    });

    excelData.push(headers);

    // Process each participant
    studyParticipants.forEach((participant, index) => {
      const participantResults = allTaskResults.filter(
        (result) => result.participantId === participant.id
      );

      // Calculate statistics
      const totalTasks = tasks.length;
      const completedTasks = participantResults.filter((r) => !r.skipped).length;
      const skippedTasks = participantResults.filter((r) => r.skipped).length;
      const successfulTasks = participantResults.filter((r) => r.successful && !r.skipped).length;
      const directTasks = participantResults.filter((r) => r.directPathTaken && !r.skipped).length;

      const tasksCompletedPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const tasksSkippedPercent =
        totalTasks > 0 ? Math.round((skippedTasks / totalTasks) * 100) : 0;
      const tasksSuccessfulPercent =
        completedTasks > 0 ? Math.round((successfulTasks / completedTasks) * 100) : 0;
      const pathDirectnessPercent =
        completedTasks > 0 ? Math.round((directTasks / completedTasks) * 100) : 0;

      const row: (string | number)[] = [
        index + 1, // Participant ID (1 to n)
        participant.completedAt ? "Completed" : "Abandoned",
        formatTimestamp(participant.startedAt),
        formatTimestamp(participant.completedAt),
        formatDuration(participant.durationSeconds),
        tasksCompletedPercent,
        tasksSkippedPercent,
        tasksSuccessfulPercent,
        pathDirectnessPercent,
      ];

      // Add task-specific data
      tasks.forEach((task) => {
        const taskResult = participantResults.find((r) => r.taskId === task.id);

        if (taskResult) {
          row.push(taskResult.pathTaken);
          row.push(
            getTaskOutcome(taskResult.successful, taskResult.directPathTaken, taskResult.skipped)
          );
          row.push(taskResult.confidenceRating || "");
          row.push(getConfidenceLabel(taskResult.confidenceRating));
        } else {
          // Task not attempted
          row.push("");
          row.push("");
          row.push("");
          row.push("");
        }
      });

      excelData.push(row);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Auto-size columns
    const colWidths = headers.map((header, colIndex) => {
      const maxLength = Math.max(
        header.length,
        ...excelData.slice(1).map((row) => String(row[colIndex] || "").length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Study Results");

    // Generate Excel file as ArrayBuffer
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    // Create filename in format: "Study-Title_results_2025-08-26.xlsx"
    const sanitizedTitle = sanitizeFilename(study.title || "Untitled-Study");
    const currentDate = getCurrentDate();
    const filename = `${sanitizedTitle}_results_${currentDate}.xlsx`;

    routeLogger.info("Study export generated", {
      study_id: studyId,
      participant_count: studyParticipants.length,
      task_count: tasks.length,
      filename,
    });

    // Return the file with proper headers
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    routeLogger.error("Study export failed", error, {
      study_id: params.studyId,
    });
    return NextResponse.json({ error: "Failed to export study data" }, { status: 500 });
  }
}
