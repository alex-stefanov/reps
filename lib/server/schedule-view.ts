import { and, asc, eq, inArray } from "drizzle-orm";
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
