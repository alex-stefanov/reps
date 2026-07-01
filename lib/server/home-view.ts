import { and, eq, gte, lte } from "drizzle-orm";
import { computeStreak, type StreakState } from "@/lib/core/completion";
import { addDaysISO, diffDaysISO, todayISO } from "@/lib/core/dates";
import { getDb } from "@/lib/db/client";
import { dayCompletions, type User } from "@/lib/db/schema";
import {
  ensureStandingTasks,
  getTasksForDate,
  recomputeDayCompletion,
  type TodayTask,
} from "./day";
import { getActiveProgram } from "./program";
import {
  getTodayVerification,
  syncCommitVerification,
  type SyncOutcome,
} from "./sync";

export interface SceneDay {
  date: string;
  level: number;
  complete: boolean;
  /** Past day that had tasks and wasn't finished — a gap in the path. */
  broken: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthCell {
  date: string;
  level: number;
  isToday: boolean;
  isFuture: boolean;
}

export type VerificationState = "off" | "verified" | "pending" | "unavailable";

export interface HomeView {
  dayNumber: number;
  today: string;
  tasks: TodayTask[];
  doneCount: number;
  totalCount: number;
  streak: StreakState;
  week: SceneDay[];
  todayIndex: number;
  monthLabel: string;
  monthLeading: number;
  monthCells: MonthCell[];
  verification: {
    state: VerificationState;
    commitRef: string | null;
    checkedAt: string | null;
  };
}

export async function getHomeView(user: User): Promise<HomeView | null> {
  const program = await getActiveProgram(user.id);
  if (!program) return null;

  // Sync on open (spec §13) — throttled inside; failures leave state honest.
  const syncOutcome: SyncOutcome = await syncCommitVerification(user);

  const today = todayISO(user.timezone);
  await ensureStandingTasks(user, today);
  const tasks = await getTasksForDate(user, today);
  await recomputeDayCompletion(user, today);

  const monthStart = `${today.slice(0, 8)}01`;
  const rangeStart =
    program.startDate < monthStart ? program.startDate : monthStart;

  const db = await getDb();
  const completions = await db
    .select()
    .from(dayCompletions)
    .where(
      and(
        eq(dayCompletions.userId, user.id),
        gte(dayCompletions.date, rangeStart),
        lte(dayCompletions.date, today),
      ),
    );
  const byDate = new Map(completions.map((c) => [c.date, c]));

  const streak = computeStreak(
    completions.map((c) => ({
      date: c.date,
      tasksDone: c.tasksDone,
      tasksTotal: c.tasksTotal,
    })),
    today,
  );

  const dayNumber = diffDaysISO(program.startDate, today) + 1;
  const weekIndex = Math.min(
    Math.max(Math.floor((dayNumber - 1) / 7), 0),
    program.weeks - 1,
  );
  const weekStart = addDaysISO(program.startDate, weekIndex * 7);

  const sceneDay = (date: string): SceneDay => {
    const comp = byDate.get(date);
    const isFuture = date > today;
    const complete =
      !!comp && comp.tasksTotal > 0 && comp.tasksDone >= comp.tasksTotal;
    return {
      date,
      level: comp?.contributionLevel ?? 0,
      complete,
      broken:
        !isFuture &&
        date < today &&
        !!comp &&
        comp.tasksTotal > 0 &&
        comp.tasksDone < comp.tasksTotal,
      isToday: date === today,
      isFuture,
    };
  };

  const week = Array.from({ length: 7 }, (_, i) =>
    sceneDay(addDaysISO(weekStart, i)),
  );
  const todayIndex = week.findIndex((d) => d.isToday);

  // Calendar month grid, Monday-aligned.
  const [year, month] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthCells: MonthCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDaysISO(monthStart, i);
    const comp = byDate.get(date);
    return {
      date,
      level: comp?.contributionLevel ?? 0,
      isToday: date === today,
      isFuture: date > today,
    };
  });
  const monthLeading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .toUpperCase();

  const verificationRow = user.dailyCommitOn
    ? await getTodayVerification(user)
    : undefined;
  const verification = {
    state: (!user.dailyCommitOn
      ? "off"
      : verificationRow?.commitFound
        ? "verified"
        : syncOutcome === "unavailable"
          ? "unavailable"
          : "pending") as VerificationState,
    commitRef: verificationRow?.commitRef ?? null,
    checkedAt: verificationRow?.checkedAt.toISOString() ?? null,
  };

  return {
    dayNumber,
    today,
    tasks,
    doneCount: tasks.filter((t) => t.done).length,
    totalCount: tasks.length,
    streak,
    week,
    todayIndex,
    monthLabel,
    monthLeading,
    monthCells,
    verification,
  };
}
