import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Data model per PRODUCT_SPEC §12. Phase 1 tables are fully used; `ideas`
 * exists schema-only because the spec requires the ScheduleTask.idea_id → Idea
 * relationship to exist in v1 architecture (the Ideas Pool UI is Phase 2).
 * Phase 2 adds the Finance hub tables (categories, finance_entries).
 */

export const intensityEnum = pgEnum("intensity", ["chill", "steady", "grind"]);

/** Schedule tracks (generated rows). Gym and Commit are standing tasks, not tracks. */
export const trackEnum = pgEnum("track", [
  "byox",
  "project",
  "leetcode",
  "linkedin",
]);

export const taskStatusEnum = pgEnum("task_status", ["todo", "done"]);

/** Standing daily tasks governed by settings toggles (spec §5, §6.4). */
export const standingTypeEnum = pgEnum("standing_type", ["commit", "gym"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  githubHandle: text("github_handle").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  /** IANA timezone; defines the "today" boundary for verification (§13, open Q7). */
  timezone: text("timezone").notNull().default("UTC"),
  leetcodeOn: boolean("leetcode_on").notNull().default(true),
  gymOn: boolean("gym_on").notNull().default(true),
  dailyCommitOn: boolean("daily_commit_on").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hoursPerWeek: integer("hours_per_week").notNull(),
  intensity: intensityEnum("intensity").notNull(),
  /** Day 1 of the program — drives the Home "Day X" counter. */
  startDate: date("start_date").notNull(),
  weeks: integer("weeks").notNull(),
  /** Regeneration deactivates the old program instead of deleting history. */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scheduleDays = pgTable(
  "schedule_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weekIndex: integer("week_index").notNull(),
    note: text("note"),
  },
  (t) => [uniqueIndex("schedule_days_program_date").on(t.programId, t.date)],
);

export const ideas = pgTable("ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  hours: real("hours"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scheduleTasks = pgTable("schedule_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleDayId: uuid("schedule_day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
  track: trackEnum("track").notNull(),
  label: text("label").notNull(),
  hours: real("hours").notNull(),
  status: taskStatusEnum("status").notNull().default("todo"),
  doneAt: timestamp("done_at", { withTimezone: true }),
  /** Phase 2 seam: Project slots can reference a pool idea (spec §12). */
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "set null" }),
});

export const standingTasks = pgTable(
  "standing_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: standingTypeEnum("type").notNull(),
    date: date("date").notNull(),
    status: taskStatusEnum("status").notNull().default("todo"),
    /** Only ever true for verified types (commit); gym is manual. */
    verified: boolean("verified").notNull().default(false),
    verificationSource: text("verification_source"),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("standing_tasks_user_type_date").on(t.userId, t.type, t.date)],
);

export const commitVerifications = pgTable(
  "commit_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    commitFound: boolean("commit_found").notNull(),
    /** e.g. "owner/repo@sha" of the first commit found for the day. */
    commitRef: text("commit_ref"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("commit_verifications_user_date").on(t.userId, t.date)],
);

/** Denormalized per-day rollup driving the contribution grid + streaks (spec §12). */
export const dayCompletions = pgTable(
  "day_completions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    tasksDone: integer("tasks_done").notNull().default(0),
    tasksTotal: integer("tasks_total").notNull().default(0),
    /** 0–4, GitHub-grid style, derived from tasksDone/tasksTotal. */
    contributionLevel: integer("contribution_level").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

/** Finance (spec §7, §12): categories are seeded defaults (user_id null) or user-created. */
export const categoryKindEnum = pgEnum("category_kind", ["income", "spending"]);

export const financeDirectionEnum = pgEnum("finance_direction", [
  "income",
  "spending",
]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null for seeded defaults visible to everyone (spec §12). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("categories_user_kind").on(t.userId, t.kind)],
);

export const financeEntries = pgTable(
  "finance_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    direction: financeDirectionEnum("direction").notNull(),
    /** Integer cents — money never touches floats (CLAUDE.md: treat as real financial data). */
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** User-local calendar day, like everything else in the product. */
    occurredOn: date("occurred_on").notNull(),
    /** Receipt-scan seam (P1): manual now, "receipt" later. */
    source: text("source").notNull().default("manual"),
    rawText: text("raw_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("finance_entries_user_date").on(t.userId, t.occurredOn)],
);

export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type ScheduleDay = typeof scheduleDays.$inferSelect;
export type ScheduleTask = typeof scheduleTasks.$inferSelect;
export type StandingTask = typeof standingTasks.$inferSelect;
export type CommitVerification = typeof commitVerifications.$inferSelect;
export type DayCompletion = typeof dayCompletions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type FinanceEntry = typeof financeEntries.$inferSelect;
export type Track = (typeof trackEnum.enumValues)[number];
export type StandingType = (typeof standingTypeEnum.enumValues)[number];
export type Intensity = (typeof intensityEnum.enumValues)[number];
export type CategoryKind = (typeof categoryKindEnum.enumValues)[number];
export type FinanceDirection = (typeof financeDirectionEnum.enumValues)[number];
