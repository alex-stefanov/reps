import { and, asc, eq, inArray } from "drizzle-orm";
import { contributionLevel } from "@/lib/core/completion";
import { diffDaysISO, todayISO, weekdayName } from "@/lib/core/dates";
import { getDb } from "@/lib/db/client";
import {
  scheduleDays,
  scheduleTasks,
  type Program,
  type Track,
  type User,
} from "@/lib/db/schema";
import { enabledTracks } from "./day";

export interface WeekViewTask {
  id: string;
  track: Track;
  label: string;
  hours: number;
  done: boolean;
}

export interface WeekViewDay {
  id: string;
  date: string;
  weekday: string;
  isToday: boolean;
  /** Future days are plannable but not completable. */
  isFuture: boolean;
  /** Every task done — the day counts as completed. */
  complete: boolean;
  note: string | null;
  tasks: WeekViewTask[];
  totalHours: number;
}

export interface WeekView {
  weekIndex: number;
  totalWeeks: number;
  currentWeekIndex: number;
  tracks: Track[];
  days: WeekViewDay[];
}

export async function getWeekView(
  user: User,
  program: Program,
  requestedWeek?: number,
): Promise<WeekView> {
  const db = await getDb();
  const today = todayISO(user.timezone);
  const currentWeekIndex = Math.min(
    Math.max(Math.floor(diffDaysISO(program.startDate, today) / 7), 0),
    program.weeks - 1,
  );
  const weekIndex = Math.min(
    Math.max(requestedWeek ?? currentWeekIndex, 0),
    program.weeks - 1,
  );

  const tracks = enabledTracks(user);
  const dayRows = await db
    .select()
    .from(scheduleDays)
    .where(
      and(
        eq(scheduleDays.programId, program.id),
        eq(scheduleDays.weekIndex, weekIndex),
      ),
    )
    .orderBy(asc(scheduleDays.date));

  const taskRows = dayRows.length
    ? await db
        .select()
        .from(scheduleTasks)
        .where(
          and(
            inArray(
              scheduleTasks.scheduleDayId,
              dayRows.map((d) => d.id),
            ),
            inArray(scheduleTasks.track, tracks),
          ),
        )
    : [];

  const days: WeekViewDay[] = dayRows.map((day) => {
    const tasks = taskRows
      .filter((t) => t.scheduleDayId === day.id)
      .map((t) => ({
        id: t.id,
        track: t.track,
        label: t.label,
        hours: t.hours,
        done: t.status === "done",
      }));
    return {
      id: day.id,
      date: day.date,
      weekday: weekdayName(day.date),
      isToday: day.date === today,
      isFuture: day.date > today,
      complete: tasks.length > 0 && tasks.every((t) => t.done),
      note: day.note,
      tasks,
      totalHours: tasks.reduce((s, t) => s + t.hours, 0),
    };
  });

  return {
    weekIndex,
    totalWeeks: program.weeks,
    currentWeekIndex,
    tracks,
    days,
  };
}

export interface MonthViewDay {
  date: string;
  weekdayLetter: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  tasksDone: number;
  tasksTotal: number;
  totalHours: number;
  /** 0–4 completion tint for days that have arrived; 0 for future. */
  level: number;
  isRest: boolean;
}

export interface MonthViewWeek {
  weekIndex: number;
  days: MonthViewDay[];
  totalHours: number;
  tasksDone: number;
  tasksTotal: number;
  isCurrent: boolean;
}

export interface MonthView {
  totalWeeks: number;
  currentWeekIndex: number;
  weeks: MonthViewWeek[];
}

/**
 * The whole program at a glance (spec §8.1 "switch to Month view", §8.4 P1):
 * every week a row of day cells, each carrying its planned load and — once
 * the day has arrived — its completion tint. Read-only; tap a week to drop
 * into its editable detail. One pass over the program's days + tasks.
 */
export async function getMonthView(
  user: User,
  program: Program,
): Promise<MonthView> {
  const db = await getDb();
  const today = todayISO(user.timezone);
  const currentWeekIndex = Math.min(
    Math.max(Math.floor(diffDaysISO(program.startDate, today) / 7), 0),
    program.weeks - 1,
  );
  const tracks = enabledTracks(user);

  const dayRows = await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.programId, program.id))
    .orderBy(asc(scheduleDays.date));

  const taskRows = dayRows.length
    ? await db
        .select()
        .from(scheduleTasks)
        .where(
          and(
            inArray(
              scheduleTasks.scheduleDayId,
              dayRows.map((d) => d.id),
            ),
            inArray(scheduleTasks.track, tracks),
          ),
        )
    : [];

  const tasksByDay = new Map<string, typeof taskRows>();
  for (const t of taskRows) {
    const list = tasksByDay.get(t.scheduleDayId);
    if (list) list.push(t);
    else tasksByDay.set(t.scheduleDayId, [t]);
  }

  const byWeek = new Map<number, MonthViewDay[]>();
  for (const day of dayRows) {
    const dayTasks = tasksByDay.get(day.id) ?? [];
    const tasksTotal = dayTasks.length;
    const tasksDone = dayTasks.filter((t) => t.status === "done").length;
    const arrived = day.date <= today;
    const mvDay: MonthViewDay = {
      date: day.date,
      weekdayLetter: weekdayName(day.date).charAt(0),
      isToday: day.date === today,
      isPast: day.date < today,
      isFuture: day.date > today,
      tasksDone,
      tasksTotal,
      totalHours: dayTasks.reduce((s, t) => s + t.hours, 0),
      level: arrived ? contributionLevel(tasksDone, tasksTotal) : 0,
      isRest: tasksTotal === 0,
    };
    const list = byWeek.get(day.weekIndex);
    if (list) list.push(mvDay);
    else byWeek.set(day.weekIndex, [mvDay]);
  }

  const weeks: MonthViewWeek[] = [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, days]) => ({
      weekIndex,
      days,
      totalHours: days.reduce((s, d) => s + d.totalHours, 0),
      tasksDone: days.reduce((s, d) => s + d.tasksDone, 0),
      tasksTotal: days.reduce((s, d) => s + d.tasksTotal, 0),
      isCurrent: weekIndex === currentWeekIndex,
    }));

  return { totalWeeks: program.weeks, currentWeekIndex, weeks };
}
