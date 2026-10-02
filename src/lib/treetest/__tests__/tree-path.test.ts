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
import { pathIncludes, pathStartsWith } from "@/lib/treetest/tree-path";
import { insertResult, owner, seedStudy, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

describe("tree path matching", () => {
  it("compares whole segments", () => {
    expect(pathStartsWith("/home/newsletter/latest", "/home/news")).toBe(false);
    expect(pathStartsWith("/home/news/latest", "/home/news")).toBe(true);
    expect(pathStartsWith("/home", "/home/news")).toBe(false);
    expect(pathIncludes("/home/newsletter", "/news")).toBe(false);
    expect(pathIncludes("/home/about/news/latest", "/news")).toBe(true);
    expect(pathIncludes("/home/about/news", "/about/news")).toBe(true);
    expect(pathIncludes("/home/news/about", "/about/news")).toBe(false);
  });
});

describe("first-clicked parents", () => {
  beforeAll(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      owner as Awaited<ReturnType<typeof getCurrentUser>>
    );
  });

  it("don't count /home/newsletter as a click on /home/news", async () => {
    const { participantId, taskIds } = await seedStudy(testDb, { id: "clicks", status: "active" });
    await insertResult(testDb, participantId, taskIds[0], {
      successful: true,
      pathTaken: "/home/news",
      selectedLink: "/home/news",
    });
    await insertResult(testDb, participantId, taskIds[0], {
      pathTaken: "/home/newsletter",
      selectedLink: "/home/newsletter",
    });

    const [task] = await getTasksStats("clicks");
    const clicks = Object.fromEntries(
      task.stats.parentClicks.map((c) => [c.path, [c.firstClickCount, c.totalClickCount]])
    );
    expect(clicks).toEqual({ "/home/news": [1, 1], "/home/newsletter": [1, 1] });
  });
});
