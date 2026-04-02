import { sqliteTable, integer, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id", { length: 21 }).primaryKey(),
  discordId: text("discord_id", { length: 255 }).unique(),
  googleId: text("google_id", { length: 255 }).unique(),
  email: text("email", { length: 255 }).notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  hashedPassword: text("hashed_password", { length: 255 }),
  avatar: text("avatar", { length: 255 }),
  creemCustomerId: text("creem_customer_id", { length: 255 }),
  studyLimit: integer("study_limit").notNull().default(3),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(STRFTIME('%s', 'now') * 1000)`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id", { length: 255 }).primaryKey(),
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIndex: index("idx_sessions_user_id").on(table.userId),
  })
);

export const emailVerificationCodes = sqliteTable("email_verification_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id", { length: 21 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email", { length: 255 }).notNull(),
  code: text("code", { length: 8 }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id", { length: 40 }).primaryKey(),
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIndex: index("idx_password_reset_tokens_user_id").on(table.userId),
  })
);

export const studyCollaborators = sqliteTable(
  "study_collaborators",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studyId: text("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  },
  (table) => ({
    collaborationIndex: index("idx_collaborations").on(table.studyId, table.email),
  })
);

export const studies = sqliteTable(
  "studies",
  {
    id: text("id").primaryKey(),
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    type: text("type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  },
  (table) => ({
    studyLookupIndex: index("idx_studies_lookup").on(table.userId, table.status),
  })
);

export const treeConfigs = sqliteTable("tree_configs", {
  id: text("id").primaryKey(),
  studyId: text("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  treeStructure: text("tree_structure").notNull(), // Raw string representation
  parsedTree: text("parsed_tree").notNull(), // JSON string of TreeNode[]
  welcomeMessage: text("welcome_message"),
  completionMessage: text("completion_message"),
  requireConfidenceRating: integer("require_confidence_rating", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  randomizeTasks: integer("randomize_tasks", { mode: "boolean" }).notNull().default(false),
  // Customizable text fields
  instructionsText: text("instructions_text"),
  startTestText: text("start_test_text"),
  findItHereText: text("find_it_here_text"),
  startTaskText: text("start_task_text"),
  confidenceQuestionText: text("confidence_question_text"),
  stronglyAgreeText: text("strongly_agree_text"),
  stronglyDisagreeText: text("strongly_disagree_text"),
  taskProgressText: text("task_progress_text"),
  skipTaskText: text("skip_task_text"),
  submitContinueText: text("submit_continue_text"),
  completedMessageText: text("completed_message_text"),
  nextButtonText: text("next_button_text"),
  confidenceDescriptionText: text("confidence_description_text"),
});

export const treeTasks = sqliteTable(
  "tree_tasks",
  {
    id: text("id").primaryKey(),
    studyId: text("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    taskIndex: integer("task_index").notNull(),
    description: text("description").notNull(),
    expectedAnswer: text("expected_answer").notNull(), // The correct path/destination
    maxTimeSeconds: integer("max_time_seconds"), // Moved from treeConfigs to per-task
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  },
  (table) => ({
    taskOrderIndex: index("idx_tree_tasks_order").on(table.studyId, table.taskIndex),
    uniqueTaskPerStudy: uniqueIndex("unq_study_task_index").on(table.studyId, table.taskIndex),
  })
);

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    studyId: text("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull().unique(),
    startedAt: integer("started_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
    completedAt: integer("completed_at", { mode: "timestamp" }), // Null until fully completed
    durationSeconds: integer("duration_seconds"), // Total active time spent on the study
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  },
  (table) => ({
    studyIdIndex: index("idx_participants_study_id").on(table.studyId),
  })
);

export const treeTaskResults = sqliteTable(
  "tree_task_results",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => treeTasks.id, { onDelete: "cascade" }),
    successful: integer("successful", { mode: "boolean" }).notNull(),
    directPathTaken: integer("direct_path_taken", {
      mode: "boolean",
    }).notNull(),
    completionTimeSeconds: integer("completion_time_seconds").notNull(),
    confidenceRating: integer("confidence_rating"),
    pathTaken: text("path_taken").notNull(),
    skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(STRFTIME('%s', 'now') * 1000)`),
  },
  (table) => ({
    taskLookupIndex: index("idx_task_results_lookup").on(table.participantId, table.taskId),
    taskIdIndex: index("idx_task_results_task_id").on(table.taskId),
    timeStatsIndex: index("idx_task_results_time_stats").on(
      table.taskId,
      table.completionTimeSeconds
    ),
    confidenceRatingIndex: index("idx_task_results_confidence").on(
      table.taskId,
      table.confidenceRating
    ),
    pathAnalysisIndex: index("idx_task_results_path_analysis").on(
      table.taskId,
      table.pathTaken,
      table.successful,
      table.directPathTaken
    ),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;

export type Studies = typeof studies.$inferSelect;
