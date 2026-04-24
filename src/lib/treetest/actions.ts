"use server";

import { db } from "@/db";
import { participants, studies, treeConfigs, treeTaskResults, treeTasks } from "@/db/schema";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { desc, and, ne, eq, sql, count } from "drizzle-orm";
import { StudyFormData, TreeNode } from "@/lib/types/tree-test";
import { getDefaultLanguage } from "@/lib/languages";
import { canCreateStudy } from "@/lib/billing/study-limit";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";

const defaultLanguage = getDefaultLanguage();
const defaultWelcomeMessage = defaultLanguage.messages.welcome;
const defaultCompletionMessage = defaultLanguage.messages.completion;
const defaultCustomText = defaultLanguage.customText;

export async function createStudy(type: "tree_test" | "card_sort") {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const studyId = nanoid();

  try {
    await db.transaction(
      async (tx) => {
        const [countRow] = await tx
          .select({ n: count() })
          .from(studies)
          .where(eq(studies.userId, user.id));
        const studyCount = countRow.n;
        if (!canCreateStudy(studyCount, user.studyLimit)) {
          throw new ForbiddenError("Study limit reached");
        }

        await tx.insert(studies).values({
          id: studyId,
          userId: user.id,
          title: "Untitled Study",
          description: "",
          status: "draft",
          type: type,
        });

        await tx.insert(treeConfigs).values({
          id: nanoid(),
          studyId: studyId,
          treeStructure: "",
          parsedTree: JSON.stringify([]),
          welcomeMessage: defaultWelcomeMessage,
          completionMessage: defaultCompletionMessage,
          instructionsText: defaultCustomText.instructions,
          startTestText: defaultCustomText.startTest,
          findItHereText: defaultCustomText.findItHere,
          startTaskText: defaultCustomText.startTask,
          confidenceQuestionText: defaultCustomText.confidenceQuestion,
          stronglyAgreeText: defaultCustomText.stronglyAgree,
          stronglyDisagreeText: defaultCustomText.stronglyDisagree,
          taskProgressText: defaultCustomText.taskProgress,
          skipTaskText: defaultCustomText.skipTask,
          submitContinueText: defaultCustomText.submitContinue,
          completedMessageText: defaultCustomText.completedMessage,
          nextButtonText: defaultCustomText.nextButton,
          confidenceDescriptionText: defaultCustomText.confidenceDescription,
        });
      },
      { behavior: "immediate" }
    );

    revalidatePath("/dashboard");

    return { id: studyId };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to create study:", error);
    throw new Error("Failed to create study");
  }
}

export async function updateStudyStatus(id: string, status: "draft" | "active" | "completed") {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db
      .update(studies)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(studies.id, id), eq(studies.userId, user.id)));
    // rowsAffected === 0 means study not found or not owned — intentionally ambiguous
    if (result.rowsAffected === 0) throw new ForbiddenError();

    revalidatePath(`/treetest/setup/${id}`);
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to update study status:", error);
    throw new Error("Failed to update study status");
  }
}

export async function deleteStudy(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db
      .delete(studies)
      .where(and(eq(studies.id, id), eq(studies.userId, user.id)));
    // rowsAffected === 0 means study not found or not owned — intentionally ambiguous
    if (result.rowsAffected === 0) throw new ForbiddenError();
    revalidatePath("/dashboard");
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to delete study:", error);
    throw new Error("Failed to delete study");
  }
}

export async function saveStudyData(id: string, data: StudyFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await db.transaction(async (tx) => {
      const [study] = await tx
        .select({ status: studies.status, userId: studies.userId })
        .from(studies)
        .where(eq(studies.id, id));

      if (!study || study.userId !== user.id) throw new ForbiddenError();

      await tx
        .update(studies)
        .set({
          title: data.general.title || "Untitled Study",
          description: data.general.description,
          updatedAt: new Date(),
        })
        .where(eq(studies.id, id));

      const [existingConfig] = await tx
        .select()
        .from(treeConfigs)
        .where(eq(treeConfigs.studyId, id));

      if (existingConfig) {
        await tx
          .update(treeConfigs)
          .set({
            treeStructure: data.tree.structure,
            parsedTree: JSON.stringify(data.tree.parsed),
            welcomeMessage: data.messages.welcome,
            completionMessage: data.messages.completion,
            randomizeTasks: data.tasks.randomizeTasks ?? false,
            instructionsText: data.customText.instructions,
            startTestText: data.customText.startTest,
            findItHereText: data.customText.findItHere,
            startTaskText: data.customText.startTask,
            confidenceQuestionText: data.customText.confidenceQuestion,
            stronglyAgreeText: data.customText.stronglyAgree,
            stronglyDisagreeText: data.customText.stronglyDisagree,
            taskProgressText: data.customText.taskProgress,
            skipTaskText: data.customText.skipTask,
            submitContinueText: data.customText.submitContinue,
            completedMessageText: data.customText.completedMessage,
            nextButtonText: data.customText.nextButton,
            confidenceDescriptionText: data.customText.confidenceDescription,
          })
          .where(eq(treeConfigs.studyId, id));
      } else {
        await tx.insert(treeConfigs).values({
          id: nanoid(),
          studyId: id,
          treeStructure: data.tree.structure,
          parsedTree: JSON.stringify(data.tree.parsed),
          welcomeMessage: data.messages.welcome,
          completionMessage: data.messages.completion,
          randomizeTasks: data.tasks.randomizeTasks ?? false,
          instructionsText: data.customText.instructions,
          startTestText: data.customText.startTest,
          findItHereText: data.customText.findItHere,
          startTaskText: data.customText.startTask,
          confidenceQuestionText: data.customText.confidenceQuestion,
          stronglyAgreeText: data.customText.stronglyAgree,
          stronglyDisagreeText: data.customText.stronglyDisagree,
          taskProgressText: data.customText.taskProgress,
          skipTaskText: data.customText.skipTask,
          submitContinueText: data.customText.submitContinue,
          completedMessageText: data.customText.completedMessage,
          nextButtonText: data.customText.nextButton,
          confidenceDescriptionText: data.customText.confidenceDescription,
        });
      }

      // Handle tasks based on study status
      if (study?.status === "draft") {
        // In draft mode, can delete and recreate tasks
        await tx.delete(treeTasks).where(eq(treeTasks.studyId, id));

        if (data.tasks.items.length > 0) {
          const tasksToInsert = data.tasks.items
            .filter((task) => task.description && task.answer)
            .map((task, index) => ({
              id: nanoid(),
              studyId: id,
              taskIndex: index,
              description: task.description,
              expectedAnswer: task.answer,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

          if (tasksToInsert.length > 0) {
            await tx.insert(treeTasks).values(tasksToInsert);
          }
        }
      } else {
        // Not in draft mode, update existing tasks only
        const existingTasks = await tx
          .select()
          .from(treeTasks)
          .where(eq(treeTasks.studyId, id))
          .orderBy(treeTasks.taskIndex);

        const now = new Date();
        // Precompute once: the tree is identical across every task's result
        // re-evaluation, so we only need to walk it a single time per save.
        const validLinks = collectValidLinks(data.tree.parsed);

        await Promise.all(
          existingTasks.map(async (task, index) => {
            const updatedTask = data.tasks.items[index];
            if (
              !updatedTask?.description ||
              !updatedTask?.answer ||
              (task.description === updatedTask.description &&
                task.expectedAnswer === updatedTask.answer)
            ) {
              return;
            }

            // Update task
            await tx
              .update(treeTasks)
              .set({
                description: updatedTask.description,
                expectedAnswer: updatedTask.answer,
                updatedAt: now,
              })
              .where(eq(treeTasks.id, task.id));

            // If answer changed, update all results for this task
            if (task.expectedAnswer !== updatedTask.answer) {
              const taskResults = await tx
                .select()
                .from(treeTaskResults)
                .where(eq(treeTaskResults.taskId, task.id));

              const correctAnswers = updatedTask.answer.split(",").map((a) => a.trim());

              await Promise.all(
                taskResults.map((result) => {
                  const actualPath = resolveSelectedLink(validLinks, result.pathTaken);

                  return tx
                    .update(treeTaskResults)
                    .set({
                      successful: actualPath ? correctAnswers.includes(actualPath) : false,
                    })
                    .where(eq(treeTaskResults.id, result.id));
                })
              );
            }
          })
        );
      }
    });

    revalidatePath(`/treetest/setup/${id}`);
    revalidatePath(`/treetest/results/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to save study data:", error);
    throw new Error("Failed to save study data");
  }
}

export async function loadStudyData(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const [study] = await db
      .select()
      .from(studies)
      .where(and(eq(studies.id, id), eq(studies.userId, user.id)));
    if (!study) throw new ForbiddenError();

    const [config] = await db.select().from(treeConfigs).where(eq(treeConfigs.studyId, id));

    const tasks = await db
      .select()
      .from(treeTasks)
      .where(eq(treeTasks.studyId, id))
      .orderBy(treeTasks.taskIndex);

    return {
      general: {
        title: study.title,
        description: study.description || "",
        status: study.status,
      },
      tree: {
        structure: config?.treeStructure || "",
        parsed: config?.parsedTree ? (JSON.parse(config.parsedTree) as TreeNode[]) : [],
      },
      tasks: {
        items: tasks.map((task) => ({
          description: task.description,
          answer: task.expectedAnswer,
        })),
        randomizeTasks: config?.randomizeTasks ?? false,
      },
      messages: {
        welcome: config?.welcomeMessage || "",
        completion: config?.completionMessage || "",
      },
      customText: {
        instructions: config?.instructionsText || defaultCustomText.instructions,
        startTest: config?.startTestText || defaultCustomText.startTest,
        findItHere: config?.findItHereText || defaultCustomText.findItHere,
        startTask: ensureRequiredPlaceholders(
          config?.startTaskText || defaultCustomText.startTask,
          "startTask"
        ),
        confidenceQuestion: config?.confidenceQuestionText || defaultCustomText.confidenceQuestion,
        stronglyAgree: config?.stronglyAgreeText || defaultCustomText.stronglyAgree,
        stronglyDisagree: config?.stronglyDisagreeText || defaultCustomText.stronglyDisagree,
        taskProgress: ensureRequiredPlaceholders(
          config?.taskProgressText || defaultCustomText.taskProgress,
          "taskProgress"
        ),
        skipTask: config?.skipTaskText || defaultCustomText.skipTask,
        submitContinue: config?.submitContinueText || defaultCustomText.submitContinue,
        completedMessage: config?.completedMessageText || defaultCustomText.completedMessage,
        nextButton: config?.nextButtonText || defaultCustomText.nextButton,
        confidenceDescription:
          config?.confidenceDescriptionText || defaultCustomText.confidenceDescription,
      },
    } satisfies StudyFormData;
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to load study data:", error);
    throw new Error("Failed to load study data");
  }
}

const INSTRUCTION_IMAGE_URL =
  "https://e9o0t6wxcl.ufs.sh/f/N8tEtWy9srqHruPeXEOiWZmNoFO2y4vQ9UbTEwSCe3B8AfYJ";

function processInstructionsText(text: string): string {
  return text.replace(/!\[\]\(instruction-img\)/g, `![](${INSTRUCTION_IMAGE_URL})`);
}

function ensureRequiredPlaceholders(text: string, fieldType: "startTask" | "taskProgress"): string {
  if (fieldType === "startTask") {
    // Ensure {0} is present for task number
    if (!text.includes("{0}")) {
      return text + " {0}";
    }
  } else if (fieldType === "taskProgress") {
    // Ensure both {0} and {1} are present
    if (!text.includes("{0}")) {
      text = text + " {0}";
    }
    if (!text.includes("{1}")) {
      text = text.replace("{0}", "{0} of {1}");
    }
  }
  return text;
}

export async function loadTestPageData(id: string) {
  try {
    const [config] = await db
      .select({
        welcomeMessage: treeConfigs.welcomeMessage,
        instructionsText: treeConfigs.instructionsText,
        startTestText: treeConfigs.startTestText,
        nextButtonText: treeConfigs.nextButtonText,
        completedMessageText: treeConfigs.completedMessageText,
        status: studies.status,
      })
      .from(treeConfigs)
      .innerJoin(studies, eq(studies.id, treeConfigs.studyId))
      .where(eq(treeConfigs.studyId, id));

    const instructionsText = config?.instructionsText || defaultCustomText.instructions;

    return {
      welcomeMessage: config?.welcomeMessage || defaultWelcomeMessage,
      customText: {
        instructions: processInstructionsText(instructionsText),
        startTest: config?.startTestText || defaultCustomText.startTest,
        nextButton: config?.nextButtonText || defaultCustomText.nextButton,
      },
      completedMessage: config?.completedMessageText || defaultCustomText.completedMessage,
      isCompleted: config?.status === "completed",
    };
  } catch (error) {
    console.error("Failed to load test page data:", error);
    throw new Error("Failed to load test page data");
  }
}

export async function loadWelcomeMessage(id: string) {
  try {
    const [config] = await db
      .select({
        welcomeMessage: treeConfigs.welcomeMessage,
      })
      .from(treeConfigs)
      .where(eq(treeConfigs.studyId, id));

    return config?.welcomeMessage || defaultWelcomeMessage;
  } catch (error) {
    console.error("Failed to load welcome message:", error);
    throw new Error("Failed to load welcome message");
  }
}

export async function loadCustomText(id: string) {
  try {
    const [config] = await db
      .select({
        instructionsText: treeConfigs.instructionsText,
        startTestText: treeConfigs.startTestText,
      })
      .from(treeConfigs)
      .where(eq(treeConfigs.studyId, id));

    return {
      instructions: config?.instructionsText || defaultCustomText.instructions,
      startTest: config?.startTestText || defaultCustomText.startTest,
    };
  } catch (error) {
    console.error("Failed to load custom text:", error);
    throw new Error("Failed to load custom text");
  }
}

export async function loadCompletedMessage(id: string) {
  try {
    const [config] = await db
      .select({
        completedMessageText: treeConfigs.completedMessageText,
      })
      .from(treeConfigs)
      .where(eq(treeConfigs.studyId, id));

    return config?.completedMessageText || defaultCustomText.completedMessage;
  } catch (error) {
    console.error("Failed to load completed message:", error);
    throw new Error("Failed to load completed message");
  }
}

export async function loadCompletionMessage(id: string) {
  try {
    const [config] = await db
      .select({
        completionMessage: treeConfigs.completionMessage,
      })
      .from(treeConfigs)
      .where(eq(treeConfigs.studyId, id));

    return config?.completionMessage || defaultCompletionMessage;
  } catch (error) {
    console.error("Failed to load completion message:", error);
    throw new Error("Failed to load completion message");
  }
}

export async function loadTestConfig(id: string, preview: boolean = false, participantId?: string) {
  try {
    const [config] = await db
      .select({
        treeStructure: treeConfigs.parsedTree,
        requireConfidenceRating: treeConfigs.requireConfidenceRating,
        randomizeTasks: treeConfigs.randomizeTasks,
        instructionsText: treeConfigs.instructionsText,
        startTestText: treeConfigs.startTestText,
        findItHereText: treeConfigs.findItHereText,
        startTaskText: treeConfigs.startTaskText,
        confidenceQuestionText: treeConfigs.confidenceQuestionText,
        stronglyAgreeText: treeConfigs.stronglyAgreeText,
        stronglyDisagreeText: treeConfigs.stronglyDisagreeText,
        taskProgressText: treeConfigs.taskProgressText,
        skipTaskText: treeConfigs.skipTaskText,
        submitContinueText: treeConfigs.submitContinueText,
        completedMessageText: treeConfigs.completedMessageText,
        nextButtonText: treeConfigs.nextButtonText,
        confidenceDescriptionText: treeConfigs.confidenceDescriptionText,
      })
      .from(treeConfigs)
      .where(eq(treeConfigs.studyId, id));

    const tasks = await db
      .select({
        id: treeTasks.id,
        description: treeTasks.description,
        expectedAnswer: treeTasks.expectedAnswer,
      })
      .from(treeTasks)
      .where(eq(treeTasks.studyId, id))
      .orderBy(treeTasks.taskIndex);

    if (!config) throw new Error("Test configuration not found");

    // check if participantId is already in the database
    let existingParticipantId;
    if (participantId) {
      const result = await db
        .select({ id: participants.id })
        .from(participants)
        .where(and(eq(participants.id, participantId), eq(participants.studyId, id)));
      if (result.length > 0) {
        existingParticipantId = result[0].id;
      }
    }
    if (!preview && !existingParticipantId) {
      const [participant] = await db
        .insert(participants)
        .values({
          id: nanoid(),
          studyId: id,
          sessionId: nanoid(),
          startedAt: new Date(),
        })
        .returning({ id: participants.id });
      participantId = participant.id;
    }

    return {
      tree: JSON.parse(config.treeStructure),
      tasks: tasks.map((task) => ({
        id: task.id,
        description: task.description,
        link: task.expectedAnswer,
      })),
      requireConfidenceRating: config.requireConfidenceRating,
      randomizeTasks: config.randomizeTasks,
      preview,
      participantId,
      studyId: id,
      customText: {
        instructions: config.instructionsText || defaultCustomText.instructions,
        startTest: config.startTestText || defaultCustomText.startTest,
        findItHere: config.findItHereText || defaultCustomText.findItHere,
        startTask: ensureRequiredPlaceholders(
          config.startTaskText || defaultCustomText.startTask,
          "startTask"
        ),
        confidenceQuestion: config.confidenceQuestionText || defaultCustomText.confidenceQuestion,
        stronglyAgree: config.stronglyAgreeText || defaultCustomText.stronglyAgree,
        stronglyDisagree: config.stronglyDisagreeText || defaultCustomText.stronglyDisagree,
        taskProgress: ensureRequiredPlaceholders(
          config.taskProgressText || defaultCustomText.taskProgress,
          "taskProgress"
        ),
        skipTask: config.skipTaskText || defaultCustomText.skipTask,
        submitContinue: config.submitContinueText || defaultCustomText.submitContinue,
        completedMessage: config.completedMessageText || defaultCustomText.completedMessage,
        nextButton: config.nextButtonText || defaultCustomText.nextButton,
        confidenceDescription:
          config.confidenceDescriptionText || defaultCustomText.confidenceDescription,
      },
    };
  } catch (error) {
    console.error("Failed to load test configuration:", error);
    throw new Error("Failed to load test configuration");
  }
}

export async function storeTreeTaskResult(
  participantId: string,
  taskId: string,
  result: {
    successful: boolean;
    directPathTaken: boolean;
    completionTimeSeconds: number;
    confidenceRating?: number;
    pathTaken: string;
    skipped: boolean;
  }
) {
  try {
    await db.insert(treeTaskResults).values({
      id: nanoid(),
      participantId,
      taskId,
      successful: result.successful,
      directPathTaken: result.directPathTaken,
      completionTimeSeconds: result.completionTimeSeconds,
      confidenceRating: result.confidenceRating,
      pathTaken: result.pathTaken,
      skipped: result.skipped,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to store tree task result:", error);
    throw new Error("Failed to store tree task result");
  }
}

export async function updateParticipantCompletion(
  participantId: string,
  activeTime: number | null
) {
  try {
    await db
      .update(participants)
      .set({
        completedAt: new Date(),
        durationSeconds: activeTime,
      })
      .where(eq(participants.id, participantId));

    return { success: true };
  } catch (error) {
    console.error("Failed to update participant completion time:", error);
    throw new Error("Failed to update participant completion time");
  }
}

export async function getStudyDetails(studyId: string): Promise<{ title: string; status: string }> {
  try {
    const study = await db
      .select({
        title: studies.title,
        status: studies.status,
      })
      .from(studies)
      .where(eq(studies.id, studyId))
      .get();

    return {
      title: study?.title || "Study Results",
      status: study?.status || "draft",
    };
  } catch (error) {
    console.error("Failed to get study details:", error);
    return {
      title: "Study Results",
      status: "draft",
    };
  }
}

export async function checkStudyCompletion(id: string): Promise<boolean> {
  try {
    const [config] = await db
      .select({
        status: studies.status,
      })
      .from(studies)
      .where(eq(studies.id, id));

    return config?.status === "completed";
  } catch (error) {
    console.error("Failed to load welcome message:", error);
    throw new Error("Failed to load welcome message");
  }
}

export async function getExistingStudies(currentStudyId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const studiesList = await db
      .select({
        id: studies.id,
        title: studies.title,
        taskCount: sql<number>`count(${treeTasks.id})`.mapWith(Number),
        updatedAt: studies.updatedAt,
      })
      .from(studies)
      .leftJoin(treeTasks, eq(treeTasks.studyId, studies.id))
      .where(
        and(
          eq(studies.userId, user.id),
          eq(studies.type, "tree_test"),
          ne(studies.id, currentStudyId)
        )
      )
      .groupBy(studies.id, studies.title, studies.updatedAt)
      .having(sql`count(${treeTasks.id}) > 0`)
      .orderBy(desc(studies.updatedAt));

    return studiesList;
  } catch (error) {
    console.error("Failed to get existing studies:", error);
    throw new Error("Failed to get existing studies");
  }
}

export async function getStudyTasks(studyId: string) {
  try {
    const tasks = await db
      .select({
        description: treeTasks.description,
        answer: treeTasks.expectedAnswer,
      })
      .from(treeTasks)
      .where(eq(treeTasks.studyId, studyId))
      .orderBy(treeTasks.taskIndex);

    return tasks;
  } catch (error) {
    console.error("Failed to get study tasks:", error);
    throw new Error("Failed to get study tasks");
  }
}

/**
 * DFS-collect every leaf `link` from a parsed tree. Exposed separately from
 * `findLastValidPath` so callers that resolve many pathTaken strings against
 * the same tree (e.g. recalculateStudyResults, saveStudyData) can hoist this
 * O(nodes) walk out of their per-result loop.
 */
function collectValidLinks(tree: TreeNode[]): string[] {
  const validLinks: string[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.link) {
        validLinks.push(node.link);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return validLinks;
}

/**
 * Resolve the leaf a participant most likely selected by matching their
 * accumulated pathTaken string against the study's valid leaf links.
 *
 * Callers that already have `validLinks` for the study should call this
 * directly; `findLastValidPath` is a convenience wrapper for single-shot
 * callers that only have the parsed tree.
 */
function resolveSelectedLink(validLinks: string[], pathTaken: string): string | null {
  // Sort by length descending once so every subsequent step inherits a stable
  // "longest/most-specific wins" order. Using the sorted list in the suffix
  // loop below also removes a subtle source of non-determinism: previously
  // `matches[0]` from the unsorted list leaked DFS sibling order into the
  // fallback, so reordering tree nodes could flip a result on re-recalculation.
  const sortedLinks = [...validLinks].sort((a, b) => b.length - a.length);

  // First: check if pathTaken ends with a valid link (uses full path context to
  // avoid mismatches when different branches have nodes with the same name).
  for (const link of sortedLinks) {
    if (pathTaken.endsWith(link)) {
      return link;
    }
  }

  // Second: handle truncated paths from the updatePathTaken bug where parent
  // and child share the same sanitized name (e.g., pathTaken = "a/b" when the
  // actual selection was "a/b/b"). Check if repeating the last segment matches.
  const lastSegment = pathTaken.split("/").filter(Boolean).pop();
  if (lastSegment) {
    const withRepeated = `${pathTaken}/${lastSegment}`;
    for (const link of sortedLinks) {
      if (withRepeated.endsWith(link)) {
        return link;
      }
    }
  }

  // Third: multi-segment suffix matching for backtracking users.
  // When a participant navigates through multiple branches before selecting a leaf,
  // pathTaken accumulates segments from every branch visited (e.g. the user went
  // through "support" before landing on "about-us/contact-us", so pathTaken becomes
  // "/home/support/about-us/contact-us" while selectedLink is "/home/about-us/contact-us").
  // The simple endsWith() check above fails in this case because the extra branch segments
  // sit between the root prefix and the correct suffix.
  //
  // Fix: progressively build longer trailing suffixes of pathTaken (1 segment, 2, 3 …)
  // and check how many valid links end with each suffix. The first suffix length that
  // produces exactly one match unambiguously identifies the selected node.
  //
  // If every suffix length is ambiguous (e.g. two sibling leaves share the exact
  // same name at every ancestor level — extremely rare), return the first candidate
  // from the smallest ambiguous set seen so far (tracked in lastResortMatch below)
  // rather than returning null. Because we filter from `sortedLinks`, that first
  // candidate is the longest (most specific) match at that suffix level, not
  // whatever happens to come first in tree-traversal order.
  const segments = pathTaken.split("/").filter(Boolean);
  let lastResortMatch: string | null = null;
  let currentBestMatchCount = Infinity;
  for (let numSegments = 1; numSegments <= segments.length; numSegments++) {
    const suffix = "/" + segments.slice(segments.length - numSegments).join("/");
    const matches = sortedLinks.filter((link) => link.endsWith(suffix));
    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length === 0) {
      // A longer suffix won't match either — stop early.
      break;
    }
    // Multiple matches: track the most specific (smallest) ambiguous set seen so far
    // so the fallback reflects the longest suffix that still matched something, rather
    // than the first (least-specific) ambiguous set.
    if (lastResortMatch === null || matches.length < currentBestMatchCount) {
      lastResortMatch = matches[0];
      currentBestMatchCount = matches.length;
    }
  }

  return lastResortMatch;
}

/**
 * Convenience wrapper around `collectValidLinks` + `resolveSelectedLink` for
 * single-shot callers. Hot loops should call the two functions directly so
 * the tree walk doesn't run per result.
 */
function findLastValidPath(tree: TreeNode[], pathTaken: string): string | null {
  return resolveSelectedLink(collectValidLinks(tree), pathTaken);
}

export async function recalculateStudyResults(studyId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Ownership + config fetched in a single query to avoid an extra Turso read.
    // This conflates "not owner" with "no treeConfig row", but treeConfigs is
    // always created atomically with the study in createStudy(), so the latter
    // case cannot occur in practice. Will be revisited in a future overhaul.
    const [configRow] = await db
      .select({ parsedTree: treeConfigs.parsedTree })
      .from(treeConfigs)
      .innerJoin(studies, eq(studies.id, treeConfigs.studyId))
      .where(and(eq(treeConfigs.studyId, studyId), eq(studies.userId, user.id)));
    if (configRow === undefined) throw new ForbiddenError();
    if (!configRow.parsedTree) throw new Error("No tree config found");

    const parsedTree = JSON.parse(configRow.parsedTree) as TreeNode[];
    // Precompute once: the tree is identical across every result in the study,
    // so walking it per row (as the previous implementation did) was pure waste.
    const validLinks = collectValidLinks(parsedTree);

    const tasks = await db.select().from(treeTasks).where(eq(treeTasks.studyId, studyId));

    let updated = 0;

    for (const task of tasks) {
      const correctAnswers = task.expectedAnswer.split(",").map((a) => a.trim());

      const results = await db
        .select()
        .from(treeTaskResults)
        .where(eq(treeTaskResults.taskId, task.id));

      for (const result of results) {
        if (result.skipped) continue;

        const actualPath = resolveSelectedLink(validLinks, result.pathTaken);
        const successful = actualPath ? correctAnswers.includes(actualPath) : false;

        if (result.successful !== successful) {
          await db
            .update(treeTaskResults)
            .set({ successful })
            .where(eq(treeTaskResults.id, result.id));
          updated++;
        }
      }
    }

    revalidatePath(`/treetest/setup/${studyId}`);
    revalidatePath(`/treetest/results/${studyId}`);
    return { success: true, updated };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    if (error instanceof Error && error.message === "No tree config found") throw error;
    console.error("Failed to recalculate study results:", error);
    throw new Error("Failed to recalculate study results");
  }
}
