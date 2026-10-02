import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/posthog/server-logs", () => ({
  createRouteLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setUser: vi.fn(),
    flush: vi.fn(),
  }),
}));
vi.mock("@/db", async () => {
  const { createTestDb } = await import("./test-db");
  return { db: await createTestDb() };
});

import { db } from "@/db";
import { participants, studyCollaborators, treeTaskResults } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudyDetails, getStudyTasks } from "@/lib/treetest/actions";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";
import {
  addStudyCollaborator,
  deleteParticipant,
  deleteTaskResult,
  getParticipants,
  getStudyCollaborators,
  getStudyOverviewStats,
  getTasksStats,
  removeStudyCollaborator,
} from "@/lib/treetest/results-actions";
import { hasStudyRole, requireStudyAccess } from "@/lib/treetest/study-access";
import { GET as exportStudy } from "@/app/api/export/[studyId]/route";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { collaborator, owner, seedStudy, stranger, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

function signIn(user: { id: string; email: string } | undefined) {
  vi.mocked(getCurrentUser).mockResolvedValue(user as Awaited<ReturnType<typeof getCurrentUser>>);
}

describe("hasStudyRole", () => {
  it("lets owners do everything", () => {
    expect(hasStudyRole("owner", "owner")).toBe(true);
    expect(hasStudyRole("owner", "collaborator")).toBe(true);
  });

  it("lets collaborators view but not manage", () => {
    expect(hasStudyRole("collaborator", "collaborator")).toBe(true);
    expect(hasStudyRole("collaborator", "owner")).toBe(false);
  });

  it("denies users without a role", () => {
    expect(hasStudyRole(null, "collaborator")).toBe(false);
    expect(hasStudyRole(null, "owner")).toBe(false);
  });
});

describe("requireStudyAccess", () => {
  beforeAll(async () => {
    await seedStudy(testDb, { id: "access-study", status: "active" });
    await testDb
      .insert(studyCollaborators)
      .values({ studyId: "access-study", email: collaborator.email });
  });

  it("resolves the owner and collaborator roles", async () => {
    signIn(owner);
    await expect(requireStudyAccess("access-study", "owner")).resolves.toMatchObject({
      role: "owner",
    });
    signIn(collaborator);
    await expect(requireStudyAccess("access-study")).resolves.toMatchObject({
      role: "collaborator",
    });
  });

  it("rejects collaborators for owner-only operations", async () => {
    signIn(collaborator);
    await expect(requireStudyAccess("access-study", "owner")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("rejects other users and missing studies the same way", async () => {
    signIn(stranger);
    await expect(requireStudyAccess("access-study")).rejects.toBeInstanceOf(ForbiddenError);
    signIn(owner);
    await expect(requireStudyAccess("no-such-study")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects signed-out callers", async () => {
    signIn(undefined);
    await expect(requireStudyAccess("access-study")).rejects.toThrow("Unauthorized");
  });
});

describe("results actions", () => {
  let participantId: string;
  let resultId: string;

  beforeAll(async () => {
    const seeded = await seedStudy(testDb, { id: "results-study", status: "active" });
    participantId = seeded.participantId;
    await testDb
      .insert(studyCollaborators)
      .values({ studyId: "results-study", email: collaborator.email });
    resultId = "results-study-result";
    await testDb.insert(treeTaskResults).values({
      id: resultId,
      participantId,
      taskId: seeded.taskIds[0],
      successful: true,
      directPathTaken: true,
      completionTimeSeconds: 5,
      pathTaken: "/home/news",
      selectedLink: "/home/news",
    });
    await seedStudy(testDb, { id: "other-study", status: "active" });
  });

  beforeEach(() => signIn(stranger));

  it("lets collaborators read everything the results page shows", async () => {
    signIn(collaborator);
    await expect(getStudyOverviewStats("results-study")).resolves.toBeDefined();
    await expect(getTasksStats("results-study")).resolves.toHaveLength(2);
    await expect(getParticipants("results-study")).resolves.toHaveLength(1);
    await expect(getStudyCollaborators("results-study")).resolves.toHaveLength(1);
    await expect(getStudyDetails("results-study")).resolves.toMatchObject({ status: "active" });
  });

  it("rejects reads from users the study isn't shared with", async () => {
    for (const read of [
      getStudyOverviewStats,
      getTasksStats,
      getParticipants,
      getStudyCollaborators,
      getStudyDetails,
    ]) {
      await expect(read("results-study")).rejects.toBeInstanceOf(ForbiddenError);
    }
  });

  it("keeps changes owner-only", async () => {
    signIn(collaborator);
    await expect(addStudyCollaborator("results-study", "new@example.com")).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(removeStudyCollaborator("results-study", 1)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(deleteTaskResult("results-study", resultId)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(deleteParticipant("results-study", participantId)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(getStudyTasks("results-study")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only deletes rows that belong to the study the caller owns", async () => {
    signIn(owner);
    // The owner of other-study can't reach results-study's rows through it
    await expect(deleteParticipant("other-study", participantId)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(deleteTaskResult("other-study", resultId)).rejects.toBeInstanceOf(ForbiddenError);
    const [collab] = await testDb
      .select({ id: studyCollaborators.id })
      .from(studyCollaborators)
      .where(eq(studyCollaborators.studyId, "results-study"));
    await expect(removeStudyCollaborator("other-study", collab.id)).rejects.toBeInstanceOf(
      ForbiddenError
    );

    const remaining = await testDb
      .select()
      .from(participants)
      .where(eq(participants.id, participantId));
    expect(remaining).toHaveLength(1);
  });

  it("lets the owner manage collaborators and delete results", async () => {
    signIn(owner);
    await expect(addStudyCollaborator("results-study", " not-an-email ")).rejects.toThrow();
    await addStudyCollaborator("results-study", "new@example.com");
    const added = (await getStudyCollaborators("results-study")).find(
      (c) => c.email === "new@example.com"
    )!;
    await removeStudyCollaborator("results-study", added.id);
    await deleteTaskResult("results-study", resultId);
    await deleteParticipant("results-study", participantId);
    await expect(getParticipants("results-study")).resolves.toHaveLength(0);
  });
});

describe("export route", () => {
  beforeAll(async () => {
    await seedStudy(testDb, { id: "export-study", status: "active" });
    await testDb
      .insert(studyCollaborators)
      .values({ studyId: "export-study", email: collaborator.email });
  });

  const request = () => new NextRequest("http://localhost/api/export/export-study");
  const params = { params: { studyId: "export-study" } };

  it("exports for owners and collaborators", async () => {
    signIn(owner);
    expect((await exportStudy(request(), params)).status).toBe(200);
    signIn(collaborator);
    expect((await exportStudy(request(), params)).status).toBe(200);
  });

  it("returns 404 to other users", async () => {
    signIn(stranger);
    expect((await exportStudy(request(), params)).status).toBe(404);
  });
});
