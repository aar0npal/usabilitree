import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/db", async () => {
  const { createTestDb } = await import("./test-db");
  return { db: await createTestDb() };
});

import { db } from "@/db";
import { participants, treeTaskResults, treeTasks } from "@/db/schema";
import {
  loadTestConfig,
  storeTreeTaskResult,
  updateParticipantCompletion,
} from "@/lib/treetest/actions";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";
import { scoreSubmission } from "@/lib/treetest/scoring";
import { eq } from "drizzle-orm";
import { seedStudy, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

const resultsFor = (participantId: string) =>
  testDb.select().from(treeTaskResults).where(eq(treeTaskResults.participantId, participantId));

const countParticipants = async (studyId: string) =>
  (await testDb.select().from(participants).where(eq(participants.studyId, studyId))).length;

describe("scoreSubmission", () => {
  it("accepts any comma-separated answer, trimmed", () => {
    const submission = { pathTaken: "/a/b", selectedLink: "/a/b" };
    expect(scoreSubmission("/x, /a/b", submission)).toEqual({
      successful: true,
      directPathTaken: true,
    });
    expect(scoreSubmission("/x", submission).successful).toBe(false);
  });

  it("scores a skip (no selection) as unsuccessful", () => {
    expect(scoreSubmission("/a/b", { pathTaken: "", selectedLink: null })).toEqual({
      successful: false,
      directPathTaken: true,
    });
    expect(scoreSubmission("/a/b", { pathTaken: "/a", selectedLink: null }).directPathTaken).toBe(
      false
    );
  });
});

describe("storeTreeTaskResult", () => {
  let live: Awaited<ReturnType<typeof seedStudy>>;
  let other: Awaited<ReturnType<typeof seedStudy>>;
  let draft: Awaited<ReturnType<typeof seedStudy>>;

  beforeAll(async () => {
    live = await seedStudy(testDb, { id: "live", status: "active" });
    other = await seedStudy(testDb, { id: "other", status: "active" });
    draft = await seedStudy(testDb, { id: "draft", status: "draft" });
  });

  const answer = (selectedLink: string, pathTaken = selectedLink) => ({
    completionTimeSeconds: 3.2,
    confidenceRating: 6,
    pathTaken,
    selectedLink,
    skipped: false,
  });

  it("scores answers on the server, ignoring outcome fields from the browser", async () => {
    await storeTreeTaskResult(live.participantId, live.taskIds[0], {
      ...answer("/home/newsletter"),
      // Sent by older clients; must not be trusted
      successful: true,
      directPathTaken: true,
    } as Parameters<typeof storeTreeTaskResult>[2]);
    await storeTreeTaskResult(
      live.participantId,
      live.taskIds[0],
      answer("/home/news", "/home/about/news")
    );

    const rows = await resultsFor(live.participantId);
    expect(rows.map((r) => [r.selectedLink, r.successful, r.directPathTaken])).toEqual([
      ["/home/newsletter", false, true],
      ["/home/news", true, false],
    ]);
  });

  it("matches the participant UI's rule for comma-separated answers", async () => {
    const { taskIds, participantId } = await seedStudy(testDb, { id: "multi", status: "active" });
    await testDb
      .update(treeTasks)
      .set({ expectedAnswer: "/home/news, /home/about/contact" })
      .where(eq(treeTasks.id, taskIds[0]));

    await storeTreeTaskResult(participantId, taskIds[0], answer("/home/about/contact"));
    const [row] = await resultsFor(participantId);
    expect(row.successful).toBe(true);
  });

  it("stores skips as unsuccessful, direct only when no path was taken", async () => {
    const { participantId, taskIds } = await seedStudy(testDb, { id: "skips", status: "active" });
    const skip = (pathTaken: string) => ({
      completionTimeSeconds: 1,
      pathTaken,
      selectedLink: "/home/news",
      skipped: true,
    });
    await storeTreeTaskResult(participantId, taskIds[0], skip(""));
    await storeTreeTaskResult(participantId, taskIds[0], skip("/home/about"));

    const rows = await resultsFor(participantId);
    expect(rows.map((r) => [r.successful, r.directPathTaken, r.selectedLink])).toEqual([
      [false, true, null],
      [false, false, null],
    ]);
  });

  it("rejects a task from another study", async () => {
    await expect(
      storeTreeTaskResult(live.participantId, other.taskIds[0], answer("/home/news"))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects unknown participants", async () => {
    await expect(
      storeTreeTaskResult("no-such-participant", live.taskIds[0], answer("/home/news"))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects studies that aren't running", async () => {
    await expect(
      storeTreeTaskResult(draft.participantId, draft.taskIds[0], answer("/home/news"))
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await resultsFor(draft.participantId)).toHaveLength(0);
  });

  it("rejects malformed input", async () => {
    const bad = [
      { ...answer("/home/news"), completionTimeSeconds: -1 },
      { ...answer("/home/news"), completionTimeSeconds: Number.NaN },
      { ...answer("/home/news"), confidenceRating: 9 },
      { ...answer("/home/news"), selectedLink: null },
      { ...answer("/home/news"), pathTaken: "x".repeat(10_001) },
    ];
    for (const result of bad) {
      await expect(
        storeTreeTaskResult(live.participantId, live.taskIds[1], result)
      ).rejects.toThrow("Invalid task result");
    }
    await expect(storeTreeTaskResult("", live.taskIds[1], answer("/home/news"))).rejects.toThrow(
      "Invalid task result"
    );
  });
});

describe("updateParticipantCompletion", () => {
  it("records completion once, for running studies only", async () => {
    const live = await seedStudy(testDb, { id: "complete-live", status: "active" });
    const closed = await seedStudy(testDb, { id: "complete-closed", status: "completed" });

    await updateParticipantCompletion(live.participantId, 42.5);
    const [row] = await testDb
      .select()
      .from(participants)
      .where(eq(participants.id, live.participantId));
    expect(row.completedAt).not.toBeNull();
    expect(row.durationSeconds).toBe(42.5);

    await expect(updateParticipantCompletion(live.participantId, 99)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(updateParticipantCompletion(closed.participantId, 1)).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(updateParticipantCompletion("missing", 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stores an unreadable saved time as unknown instead of failing", async () => {
    const { participantId } = await seedStudy(testDb, { id: "complete-nan", status: "active" });
    await updateParticipantCompletion(participantId, Number.NaN);
    const [row] = await testDb
      .select()
      .from(participants)
      .where(eq(participants.id, participantId));
    expect(row.completedAt).not.toBeNull();
    expect(row.durationSeconds).toBeNull();
  });
});

describe("loadTestConfig", () => {
  it("creates participants only for running studies", async () => {
    await seedStudy(testDb, { id: "config-live", status: "active" });
    await seedStudy(testDb, { id: "config-draft", status: "draft" });
    await seedStudy(testDb, { id: "config-closed", status: "completed" });

    const config = await loadTestConfig("config-live");
    expect(config.participantId).toBeDefined();
    expect(await countParticipants("config-live")).toBe(2);

    await expect(loadTestConfig("config-draft")).rejects.toThrow();
    await expect(loadTestConfig("config-closed")).rejects.toThrow();
    expect(await countParticipants("config-draft")).toBe(1);
    expect(await countParticipants("config-closed")).toBe(1);
  });

  it("keeps preview working for drafts without creating participants", async () => {
    await seedStudy(testDb, { id: "config-preview", status: "draft" });
    const config = await loadTestConfig("config-preview", true);
    expect(config.preview).toBe(true);
    expect(config.participantId).toBeUndefined();
    expect(config.tasks).toHaveLength(2);
    expect(await countParticipants("config-preview")).toBe(1);
  });

  it("resumes an existing participant without creating another", async () => {
    const { participantId } = await seedStudy(testDb, { id: "config-resume", status: "active" });
    const config = await loadTestConfig("config-resume", false, participantId);
    expect(config.participantId).toBe(participantId);
    expect(await countParticipants("config-resume")).toBe(1);
  });
});
