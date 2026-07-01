import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { contributionLevel } from "@/lib/core/completion";
import { todayISO } from "@/lib/core/dates";
import { getDb } from "@/lib/db/client";
import {
  dayCompletions,
  scheduleDays,
  scheduleTasks,
  standingTasks,
  type StandingType,
  type Track,
  type User,
} from "@/lib/db/schema";
import { getActiveProgram } from "./program";

/**
 * Day state assembly + the DayCompletion rollup. Settings toggles genuinely
 * remove tracks here — a disabled track is excluded from tasks, totals, and
 * grid stats, not hidden in the UI (CLAUDE.md critical rule).
 */

const TRACK_ORDER: Track[] = ["byox", "project", "leetcode", "linkedin"];

export function enabledTracks(user: User): Track[] {
  return TRACK_ORDER.filter((t) => t !== "leetcode" || user.leetcodeOn);
}

export function enabledStandingTypes(user: User): StandingType[] {
  const types: StandingType[] = [];
  if (user.dailyCommitOn) types.push("commit");
  if (user.gymOn) types.push("gym");
  return types;
}

const STANDING_LABELS: Record<StandingType, string> = {
  commit: "Commit",
  gym: "Gym",
};

export interface TodayTask {
  kind: "schedule" | "standing";
  id: string;
  track: Track | StandingType;
  label: string;
  hours: number | null;
  done: boolean;
  /** True for the Commit task while verification governs it (spec §13). */
  verificationGated: boolean;
  verified: boolean;
}

/** Creates today's standing-task rows for enabled toggles if missing. */
export async function ensureStandingTasks(
  user: User,
  date: string,
): Promise<void> {
  const types = enabledStandingTypes(user);
  if (types.length === 0) return;
  const db = await getDb();
  await db
    .insert(standingTasks)
    .values(types.map((type) => ({ userId: user.id, type, date })))
    .onConflictDoNothing();
}

export async function getTasksForDate(
  user: User,
  date: string,
): Promise<TodayTask[]> {
  const db = await getDb();
  const program = await getActiveProgram(user.id);

  const tasks: TodayTask[] = [];

  if (program) {
    const day = await db.query.scheduleDays.findFirst({
      where: and(
        eq(scheduleDays.programId, program.id),
        eq(scheduleDays.date, date),
      ),
    });
    if (day) {
      const rows = await db
        .select()
        .from(scheduleTasks)
        .where(
          and(
            eq(scheduleTasks.scheduleDayId, day.id),
            inArray(scheduleTasks.track, enabledTracks(user)),
          ),
        );
      for (const row of rows) {
        tasks.push({
          kind: "schedule",
          id: row.id,
          track: row.track,
          label: row.label,
          hours: row.hours,
          done: row.status === "done",
          verificationGated: false,
          verified: false,
        });
      }
    }
  }

  const standingTypes = enabledStandingTypes(user);
  if (standingTypes.length > 0) {
    const rows = await db
      .select()
      .from(standingTasks)
      .where(
        and(
          eq(standingTasks.userId, user.id),
          eq(standingTasks.date, date),
          inArray(standingTasks.type, standingTypes),
        ),
      );
    // Stable order: commit first, then gym.
    rows.sort((a, b) => a.type.localeCompare(b.type));
    for (const row of rows) {
      tasks.push({
        kind: "standing",
        id: row.id,
        track: row.type,
        label: STANDING_LABELS[row.type],
        hours: null,
        done: row.status === "done",
        verificationGated: row.type === "commit" && user.dailyCommitOn,
        verified: row.verified,
      });
    }
  }

  return tasks;
}

/** Recomputes the DayCompletion rollup that drives the grid + streaks. */
export async function recomputeDayCompletion(
  user: User,
  date: string,
): Promise<void> {
  const tasks = await getTasksForDate(user, date);
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const db = await getDb();
  await db
    .insert(dayCompletions)
    .values({
      userId: user.id,
      date,
      tasksDone: done,
      tasksTotal: total,
      contributionLevel: contributionLevel(done, total),
    })
    .onConflictDoUpdate({
      target: [dayCompletions.userId, dayCompletions.date],
      set: {
        tasksDone: done,
        tasksTotal: total,
        contributionLevel: contributionLevel(done, total),
      },
    });
}

/**
 * Recomputes every rollup from program start through today — used when a
 * settings toggle changes, so disabled tracks vanish from history stats too.
 */
export async function recomputeAllCompletions(user: User): Promise<void> {
  const program = await getActiveProgram(user.id);
  if (!program) return;
  const today = todayISO(user.timezone);
  const db = await getDb();
  const days = await db
    .select({ date: scheduleDays.date })
    .from(scheduleDays)
    .where(
      and(
        eq(scheduleDays.programId, program.id),
        gte(scheduleDays.date, program.startDate),
        lte(scheduleDays.date, today),
      ),
    );
  for (const { date } of days) {
    await recomputeDayCompletion(user, date);
  }
}
