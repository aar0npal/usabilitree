import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/db/schema";

/**
 * A throwaway SQLite database built from the drizzle migrations. Uses a temp file rather
 * than :memory: because libsql opens a separate connection for each transaction.
 */
export async function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), "usabilitree-test-"));
  const client = createClient({ url: `file:${join(dir, "test.db")}` });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: resolve(__dirname, "../../../../drizzle") });
  return db;
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export const owner = { id: "owner-user-id-000001", email: "owner@example.com" };
export const collaborator = { id: "collab-user-id-00001", email: "collab@example.com" };
export const stranger = { id: "strang-user-id-00001", email: "stranger@example.com" };

const tree = [
  {
    name: "Home",
    children: [
      { name: "News", link: "/home/news" },
      { name: "Newsletter", link: "/home/newsletter" },
      { name: "About", children: [{ name: "Contact", link: "/home/about/contact" }] },
    ],
  },
];

/** Seeds users plus one study with a tree, two tasks and one participant. */
export async function seedStudy(
  db: TestDb,
  { id, status, ownerId = owner.id }: { id: string; status: string; ownerId?: string }
) {
  await db.insert(schema.users).values([owner, collaborator, stranger]).onConflictDoNothing();
  await db
    .insert(schema.studies)
    .values({ id, userId: ownerId, title: id, status, type: "tree_test" });
  await db.insert(schema.treeConfigs).values({
    id: `${id}-config`,
    studyId: id,
    treeStructure: "Home\n,News\n,Newsletter\n,About\n,,Contact",
    parsedTree: JSON.stringify(tree),
  });
  await db.insert(schema.treeTasks).values([
    {
      id: `${id}-task-0`,
      studyId: id,
      taskIndex: 0,
      description: "Find news",
      expectedAnswer: "/home/news",
    },
    {
      id: `${id}-task-1`,
      studyId: id,
      taskIndex: 1,
      description: "Find contact",
      expectedAnswer: "/home/about/contact",
    },
  ]);
  await db.insert(schema.participants).values({
    id: `${id}-participant`,
    studyId: id,
    sessionId: `${id}-session`,
  });
  return {
    taskIds: [`${id}-task-0`, `${id}-task-1`],
    participantId: `${id}-participant`,
    tree,
  };
}

let resultCount = 0;

/** Inserts a stored task result, defaulting to an unsuccessful, indirect answer. */
export function insertResult(
  db: TestDb,
  participantId: string,
  taskId: string,
  fields: Partial<typeof schema.treeTaskResults.$inferInsert>
) {
  return db.insert(schema.treeTaskResults).values({
    id: `result-${++resultCount}`,
    participantId,
    taskId,
    successful: false,
    directPathTaken: false,
    completionTimeSeconds: 5,
    pathTaken: "",
    ...fields,
  });
}
