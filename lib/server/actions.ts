"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayISO } from "@/lib/core/dates";
import { getDb } from "@/lib/db/client";
import {
  scheduleDays,
  scheduleTasks,
  standingTasks,
  users,
  type Intensity,
} from "@/lib/db/schema";
import { requireUser } from "./current-user";
import {
  ensureStandingTasks,
  recomputeAllCompletions,
  recomputeDayCompletion,
} from "./day";
import { createProgram } from "./program";

const INTENSITIES: Intensity[] = ["chill", "steady", "grind"];

function parseTimezone(value: unknown): string {
  const tz = typeof value === "string" ? value : "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export async function completeOnboarding(formData: FormData): Promise<void> {
  const user = await requireUser();

  const hoursPerWeek = Math.min(
    40,
    Math.max(4, Number(formData.get("hoursPerWeek")) || 10),
  );
  const intensityRaw = String(formData.get("intensity"));
  const intensity = INTENSITIES.includes(intensityRaw as Intensity)
    ? (intensityRaw as Intensity)
    : "steady";

  const input = {
    hoursPerWeek,
    intensity,
    timezone: parseTimezone(formData.get("timezone")),
    leetcodeOn: formData.get("leetcodeOn") === "on",
    gymOn: formData.get("gymOn") === "on",
    dailyCommitOn: formData.get("dailyCommitOn") === "on",
  };

  await createProgram(user, input);

  const updatedUser = { ...user, ...input };
  const today = todayISO(input.timezone);
  await ensureStandingTasks(updatedUser, today);
  await recomputeDayCompletion(updatedUser, today);

  redirect("/");
}

/** Marking done from Home or Schedule — same underlying state (spec §8.3). */
export async function setScheduleTaskDone(
  taskId: string,
  done: boolean,
): Promise<void> {
  const user = await requireUser();
  const db = await getDb();

  // Ownership check: the task must belong to one of the user's programs.
  const task = await db.query.scheduleTasks.findFirst({
    where: eq(scheduleTasks.id, taskId),
  });
  if (!task) return;
  const day = await db.query.scheduleDays.findFirst({
    where: eq(scheduleDays.id, task.scheduleDayId),
  });
  if (!day) return;
  const program = await db.query.programs.findFirst({
    where: (p, { and: andW, eq: eqW }) =>
      andW(eqW(p.id, day.programId), eqW(p.userId, user.id)),
  });
  if (!program) return;

  await db
    .update(scheduleTasks)
    .set({ status: done ? "done" : "todo", doneAt: done ? new Date() : null })
    .where(eq(scheduleTasks.id, taskId));

  await recomputeDayCompletion(user, day.date);
  revalidatePath("/");
  revalidatePath("/schedule");
}

/**
 * Standing tasks: Gym toggles freely. Commit is verification-gated — while
 * the daily-commit setting is ON, there is no manual way to check it off
 * (spec §13: that's the whole point). Unchecking is likewise refused; the
 * state belongs to the verifier.
 */
export async function setStandingTaskDone(
  taskId: string,
  done: boolean,
): Promise<{ refused?: string } | void> {
  const user = await requireUser();
  const db = await getDb();

  const task = await db.query.standingTasks.findFirst({
    where: and(eq(standingTasks.id, taskId), eq(standingTasks.userId, user.id)),
  });
  if (!task) return;

  if (task.type === "commit" && user.dailyCommitOn) {
    return { refused: "Commit checks itself off when a real public commit exists." };
  }

  await db
    .update(standingTasks)
    .set({ status: done ? "done" : "todo", doneAt: done ? new Date() : null })
    .where(eq(standingTasks.id, taskId));

  await recomputeDayCompletion(user, task.date);
  revalidatePath("/");
}

export async function updateScheduleTaskHours(
  taskId: string,
  hours: number,
): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const task = await db.query.scheduleTasks.findFirst({
    where: eq(scheduleTasks.id, taskId),
  });
  if (!task) return;
  const day = await db.query.scheduleDays.findFirst({
    where: eq(scheduleDays.id, task.scheduleDayId),
  });
  if (!day) return;
  const program = await db.query.programs.findFirst({
    where: (p, { and: andW, eq: eqW }) =>
      andW(eqW(p.id, day.programId), eqW(p.userId, user.id)),
  });
  if (!program) return;

  const clamped = Math.max(0.5, Math.min(12, Math.round(hours * 2) / 2));
  await db
    .update(scheduleTasks)
    .set({ hours: clamped })
    .where(eq(scheduleTasks.id, taskId));
  revalidatePath("/schedule");
  revalidatePath("/");
}

export interface SettingsInput {
  leetcodeOn: boolean;
  gymOn: boolean;
  dailyCommitOn: boolean;
  timezone: string;
}

export async function updateSettings(input: SettingsInput): Promise<void> {
  const user = await requireUser();
  const db = await getDb();

  const timezone = parseTimezone(input.timezone);
  await db
    .update(users)
    .set({
      leetcodeOn: input.leetcodeOn,
      gymOn: input.gymOn,
      dailyCommitOn: input.dailyCommitOn,
      timezone,
    })
    .where(eq(users.id, user.id));

  const updated = { ...user, ...input, timezone };
  await ensureStandingTasks(updated, todayISO(timezone));
  // Toggles genuinely remove tracks — stats included, history included.
  await recomputeAllCompletions(updated);

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/settings");
}
