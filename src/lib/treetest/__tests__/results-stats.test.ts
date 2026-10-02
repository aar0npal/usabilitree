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
import { getCurrentUser } from "@/lib/auth/session";
import { getTasksStats } from "@/lib/treetest/results-actions";
import { insertResult, owner, seedStudy, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

beforeAll(async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(owner as Awaited<ReturnType<typeof getCurrentUser>>);
  const { participantId, taskIds } = await seedStudy(testDb, { id: "stats", status: "active" });
  // Backtracked through Newsletter and About, but the recorded selection was Newsletter;
  // matching the path alone would pick Contact
  await insertResult(testDb, participantId, taskIds[0], {
    pathTaken: "/home/newsletter/home/about/contact",
    selectedLink: "/home/newsletter",
  });
  // An older row without a recorded selection falls back to path matching
  await insertResult(testDb, participantId, taskIds[0], { pathTaken: "/home/about/contact" });
});

describe("incorrect destinations", () => {
  it("group by the recorded selection, falling back to the path taken", async () => {
    const [task] = await getTasksStats("stats");
    expect(task.stats.incorrectDestinations).toEqual([
      expect.objectContaining({
        path: "/home/newsletter/home/about/contact",
        configuredPath: "/home/newsletter",
        count: 1,
      }),
      expect.objectContaining({
        path: "/home/about/contact",
        configuredPath: "/home/about/contact",
        count: 1,
      }),
    ]);
  });
});
