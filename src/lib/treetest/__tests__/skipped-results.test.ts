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
import { treeTaskResults } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { loadStudyData, recalculateStudyResults, saveStudyData } from "@/lib/treetest/actions";
import { getStudyOverviewStats, getTasksStats } from "@/lib/treetest/results-actions";
import { rescoreResult } from "@/lib/treetest/scoring";
import { eq } from "drizzle-orm";
import { insertResult, owner, seedStudy, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

const successFor = (taskId: string) =>
  testDb
    .select({ skipped: treeTaskResults.skipped, successful: treeTaskResults.successful })
    .from(treeTaskResults)
    .where(eq(treeTaskResults.taskId, taskId));

beforeAll(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(owner as Awaited<ReturnType<typeof getCurrentUser>>);
});

describe("rescoreResult", () => {
  const sortedLinks = ["/home/about/contact", "/home/news"];

  it("leaves skipped results alone", () => {
    expect(
      rescoreResult(
        { skipped: true, selectedLink: null, pathTaken: "/home/news" },
        ["/home/news"],
        sortedLinks
      )
    ).toBeNull();
  });

  it("prefers the recorded selection and falls back to the path taken", () => {
    expect(
      rescoreResult(
        { skipped: false, selectedLink: "/home/news", pathTaken: "/home/about/contact" },
        ["/home/news"],
        sortedLinks
      )
    ).toBe(true);
    expect(
      rescoreResult(
        { skipped: false, selectedLink: null, pathTaken: "/home/about/contact" },
        ["/home/news"],
        sortedLinks
      )
    ).toBe(false);
  });
});

describe("changing a launched task's answer", () => {
  it("doesn't turn skipped answers into successes", async () => {
    const { participantId, taskIds } = await seedStudy(testDb, { id: "rescore", status: "active" });
    // Skipped while on /home/about/contact, then the owner makes that the answer
    await insertResult(testDb, participantId, taskIds[0], {
      skipped: true,
      pathTaken: "/home/about/contact",
    });
    await insertResult(testDb, participantId, taskIds[0], {
      pathTaken: "/home/about/contact",
      selectedLink: "/home/about/contact",
    });

    const data = await loadStudyData("rescore");
    data.tasks.items[0].answer = "/home/about/contact";
    await saveStudyData("rescore", data);

    expect(await successFor(taskIds[0])).toEqual([
      { skipped: true, successful: false },
      { skipped: false, successful: true },
    ]);
  });
});

describe("recalculateStudyResults", () => {
  it("keeps skipped answers unsuccessful", async () => {
    const { participantId, taskIds } = await seedStudy(testDb, { id: "recalc", status: "active" });
    await insertResult(testDb, participantId, taskIds[0], {
      skipped: true,
      pathTaken: "/home/news",
    });
    await insertResult(testDb, participantId, taskIds[0], {
      pathTaken: "/home/news",
      selectedLink: "/home/news",
    });

    await expect(recalculateStudyResults("recalc")).resolves.toMatchObject({ updated: 1 });
    expect(await successFor(taskIds[0])).toEqual([
      { skipped: true, successful: false },
      { skipped: false, successful: true },
    ]);
  });
});

describe("success rates", () => {
  it("exclude skipped results flagged successful", async () => {
    const { participantId, taskIds } = await seedStudy(testDb, { id: "rates", status: "active" });
    // A row saved as a skipped success before the guard existed
    await insertResult(testDb, participantId, taskIds[0], { skipped: true, successful: true });
    await insertResult(testDb, participantId, taskIds[0], {
      successful: true,
      pathTaken: "/home/news",
      selectedLink: "/home/news",
    });

    const [task] = await getTasksStats("rates");
    expect(task.stats.success.rate).toBe(50);
    expect((await getStudyOverviewStats("rates")).successRate).toBe(50);
  });
});
