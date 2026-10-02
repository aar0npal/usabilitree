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
import { loadStudyData, saveStudyData } from "@/lib/treetest/actions";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";
import { owner, seedStudy, type TestDb } from "./test-db";

const testDb = db as unknown as TestDb;

beforeAll(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(owner as Awaited<ReturnType<typeof getCurrentUser>>);
});

describe("saveStudyData task removal", () => {
  it("rejects removing a task after launch", async () => {
    await seedStudy(testDb, { id: "remove-task", status: "active" });
    const data = await loadStudyData("remove-task");
    data.tasks.items.splice(0, 1);
    await expect(saveStudyData("remove-task", data)).rejects.toBeInstanceOf(ForbiddenError);

    const reloaded = await loadStudyData("remove-task");
    expect(reloaded.tasks.items.map((t) => t.description)).toEqual(["Find news", "Find contact"]);
  });

  it("still lets drafts remove tasks", async () => {
    await seedStudy(testDb, { id: "remove-draft", status: "draft" });
    const data = await loadStudyData("remove-draft");
    data.tasks.items.splice(0, 1);
    await saveStudyData("remove-draft", data);
    expect((await loadStudyData("remove-draft")).tasks.items).toHaveLength(1);
  });

  it("still lets launched studies edit wording", async () => {
    await seedStudy(testDb, { id: "edit-active", status: "active" });
    const data = await loadStudyData("edit-active");
    data.tasks.items[1].description = "Find the contact page";
    await saveStudyData("edit-active", data);
    const reloaded = await loadStudyData("edit-active");
    expect(reloaded.tasks.items[1].description).toBe("Find the contact page");
  });
});
