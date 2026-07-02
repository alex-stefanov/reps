"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayISO } from "@/lib/core/dates";
import { TRACK_LABELS } from "@/lib/core/schedule";
import { getDb } from "@/lib/db/client";
import {
  scheduleDays,
  scheduleTasks,
  standingTasks,
  users,
  type Intensity,
  type Track,
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
  // Completion is for days that have arrived (planning ahead is fine).
  if (day.date > todayISO(user.timezone)) return;

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
  if (task.date > todayISO(user.timezone)) {
    return { refused: "Future tasks unlock on their day." };
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

/** Ownership guard: resolves a task to its day iff it belongs to `userId`. */
async function loadOwnedTask(taskId: string, userId: string) {
  const db = await getDb();
  const task = await db.query.scheduleTasks.findFirst({
    where: eq(scheduleTasks.id, taskId),
  });
  if (!task) return null;
  const day = await db.query.scheduleDays.findFirst({
    where: eq(scheduleDays.id, task.scheduleDayId),
  });
  if (!day) return null;
  const program = await db.query.programs.findFirst({
    where: (p, { and: andW, eq: eqW }) =>
      andW(eqW(p.id, day.programId), eqW(p.userId, userId)),
  });
  if (!program) return null;
  return { task, day };
}

async function loadOwnedDay(dayId: string, userId: string) {
  const db = await getDb();
  const day = await db.query.scheduleDays.findFirst({
    where: eq(scheduleDays.id, dayId),
  });
  if (!day) return null;
  const program = await db.query.programs.findFirst({
    where: (p, { and: andW, eq: eqW }) =>
      andW(eqW(p.id, day.programId), eqW(p.userId, userId)),
  });
  if (!program) return null;
  return day;
}

/**
 * Multi-select completion from the Schedule's + flow (spec §8.1).
 * Future days are read-only: you can plan tomorrow, not complete it.
 */
export async function setScheduleTasksDone(
  taskIds: string[],
  done: boolean,
): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const today = todayISO(user.timezone);
  const affectedDates = new Set<string>();

  for (const taskId of taskIds) {
    const owned = await loadOwnedTask(taskId, user.id);
    if (!owned) continue;
    if (owned.day.date > today) continue;
    await db
      .update(scheduleTasks)
      .set({ status: done ? "done" : "todo", doneAt: done ? new Date() : null })
      .where(eq(scheduleTasks.id, taskId));
    affectedDates.add(owned.day.date);
  }

  for (const date of affectedDates) {
    await recomputeDayCompletion(user, date);
  }
  revalidatePath("/");
  revalidatePath("/schedule");
}

export async function addScheduleTask(
  dayId: string,
  track: Track,
): Promise<void> {
  const user = await requireUser();
  const day = await loadOwnedDay(dayId, user.id);
  if (!day) return;
  const db = await getDb();
  await db.insert(scheduleTasks).values({
    scheduleDayId: dayId,
    track,
    label: TRACK_LABELS[track],
    hours: 0.5,
  });
  await recomputeDayCompletion(user, day.date);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function deleteScheduleTask(taskId: string): Promise<void> {
  const user = await requireUser();
  const owned = await loadOwnedTask(taskId, user.id);
  if (!owned) return;
  const db = await getDb();
  await db.delete(scheduleTasks).where(eq(scheduleTasks.id, taskId));
  await recomputeDayCompletion(user, owned.day.date);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function updateDayNote(
  dayId: string,
  note: string,
): Promise<void> {
  const user = await requireUser();
  const day = await loadOwnedDay(dayId, user.id);
  if (!day) return;
  const db = await getDb();
  await db
    .update(scheduleDays)
    .set({ note: note.trim() === "" ? null : note.trim().slice(0, 200) })
    .where(eq(scheduleDays.id, dayId));
  revalidatePath("/schedule");
}

/** Reset the program with new parameters (spec §8.2), keeping settings. */
export async function regenerateProgram(formData: FormData): Promise<void> {
  const user = await requireUser();
  const hoursPerWeek = Math.min(
    40,
    Math.max(4, Number(formData.get("hoursPerWeek")) || 10),
  );
  const intensityRaw = String(formData.get("intensity"));
  const intensity = INTENSITIES.includes(intensityRaw as Intensity)
    ? (intensityRaw as Intensity)
    : "steady";

  await createProgram(user, {
    hoursPerWeek,
    intensity,
    timezone: user.timezone,
    leetcodeOn: user.leetcodeOn,
    gymOn: user.gymOn,
    dailyCommitOn: user.dailyCommitOn,
  });
  await ensureStandingTasks(user, todayISO(user.timezone));
  await recomputeDayCompletion(user, todayISO(user.timezone));
  redirect("/schedule");
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
