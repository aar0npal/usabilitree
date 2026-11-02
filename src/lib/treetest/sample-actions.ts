"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { studies, treeConfigs, treeTasks, participants, treeTaskResults } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { sampleParsedTree, sampleParticipants, sampleTreeStructure } from "./sample-data";
import { count, eq } from "drizzle-orm";
import { canCreateStudy } from "@/lib/billing/study-limit";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";

export async function createSampleTreeTestStudy() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) throw new Error("Unauthorized");

  const userId = sessionUser.id;
  const studyLimit = sessionUser.studyLimit;

  const studyId = nanoid();

  const welcomeMessage = `Welcome to this Tree Test sample study!
This is a demonstration study to help you familiarize yourself with UsabiliTree's interface and functionality.

The activity should take about **5-10 minutes** to complete.

This sample is based on a real study conducted for the City Government of Parañaque website organization. Try navigating through the tree structure to find information as you would on a government website.`;

  const completionMessage = `# Great job!
You've completed the sample Tree Test study! 

This was a demonstration to help you understand how UsabiliTree works. You can now create your own studies and invite participants to help organize your website content.

Feel free to explore more features or start creating your own study.`;

  // Sample tasks from the original study
  const sampleTasks = [
    {
      description: "Where would you find the contact information for the Mayor's office?",
      expectedAnswer: "/home/government/city-officials, /home/contact-us",
    },
    {
      description: "Find information on applying for a business permit.",
      expectedAnswer: "/home/transactions-services/business-permits",
    },
    {
      description: "Where would you find how much you will pay for a traffic violation?",
      expectedAnswer: "/home/transactions-services/traffic-fines-violations",
    },
    {
      description: "Find information about tourist attractions available in the city.",
      expectedAnswer: "/home/tourism/tourist-sites-attractions",
    },
    {
      description: "Where do you find the mission and vision statement of the city government?",
      expectedAnswer: "/home/government/visionmission",
    },
    {
      description: "Check the city's annual budget information.",
      expectedAnswer: "/home/transparency-report/paranaque-yearly-budget",
    },
    {
      description: "Where would you find the requirements for health permits?",
      expectedAnswer: "/home/transactions-services/health-permits-services",
    },
    {
      description: "Find the list of City Departments.",
      expectedAnswer: "/home/government/city-departments",
    },
  ];

  const tasksToInsert = sampleTasks.map((task, index) => ({
    id: nanoid(),
    studyId: studyId,
    taskIndex: index,
    description: task.description,
    expectedAnswer: task.expectedAnswer,
  }));

  try {
    await db.transaction(
      async (tx) => {
        const [countRow] = await tx
          .select({ n: count() })
          .from(studies)
          .where(eq(studies.userId, userId));
        if (!canCreateStudy(countRow.n, studyLimit)) {
          throw new ForbiddenError("Study limit reached");
        }

        await tx.insert(studies).values({
          id: studyId,
          userId: userId,
          title: "Sample tree test",
          description: "Government website example",
          status: "active", // Make it active as requested
          type: "tree_test",
        });

        await tx.insert(treeConfigs).values({
          id: nanoid(),
          studyId: studyId,
          treeStructure: sampleTreeStructure,
          parsedTree: JSON.stringify(sampleParsedTree),
          welcomeMessage: welcomeMessage,
          completionMessage: completionMessage,
        });

        if (tasksToInsert.length > 0) {
          await tx.insert(treeTasks).values(tasksToInsert);
        }

        for (const participant of sampleParticipants) {
          const { taskResults, ...participantData } = participant;

          const participantId = nanoid();

          await tx.insert(participants).values({
            id: participantId,
            studyId,
            sessionId: nanoid(),
            startedAt: participantData.startedAt,
            completedAt: participantData.completedAt,
            durationSeconds: participantData.durationSeconds,
          });

          const taskResultsWithIds = taskResults.map((result) => {
            const taskRow = tasksToInsert[result.taskIndex];
            if (!taskRow) {
              throw new Error(`Sample data: invalid taskIndex ${result.taskIndex}`);
            }
            return {
              id: nanoid(),
              studyId,
              participantId: participantId,
              taskId: taskRow.id,
              successful: result.successful,
              directPathTaken: result.directPathTaken,
              completionTimeSeconds: result.completionTimeSeconds,
              confidenceRating: result.confidenceRating,
              pathTaken: result.pathTaken,
              skipped: result.skipped,
            };
          });

          await tx.insert(treeTaskResults).values(taskResultsWithIds);
        }
      },
      { behavior: "immediate" }
    );

    revalidatePath("/dashboard");

    return { id: studyId };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to create sample study:", error);
    throw new Error("Failed to create sample study");
  }
}
