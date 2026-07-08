import Link from "next/link";
import type { MonthView } from "@/lib/server/schedule-view";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { ScheduleViewToggle } from "./schedule-view-toggle";

/**
 * The program's whole shape (spec §8.4 P1). Read-only overview: each week a
 * row of day tiles carrying planned load and completion tint; tap a row to
 * open that week's editable detail. The dense counterpart to the week's
 * day-cards — the "am I on track over months" view.
 */

const LEVEL_BG = ["bg-cell-0", "bg-cell-1", "bg-cell-2", "bg-cell-3", "bg-cell-4"];

export function MonthOverview({
  month,
  hoursPerWeek,
  intensity,
}: {
  month: MonthView;
  hoursPerWeek: number;
  intensity: string;
}) {
  return (
    <div className="pb-16">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Home"
            className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
          >
            <ChevronLeftIcon className="size-4" />
          </Link>
          <div>
            <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
              Schedule
            </h1>
            <p className="num mt-1 text-sm font-medium text-sub">
              {hoursPerWeek}h / week · {intensity} · {month.totalWeeks} weeks
            </p>
          </div>
        </div>
        <ScheduleViewToggle active="month" weekIndex={month.currentWeekIndex} />
      </header>

      <div className="mt-6 flex flex-col gap-2.5">
        {month.weeks.map((week) => (
          <Link
            key={week.weekIndex}
            href={`/schedule?w=${week.weekIndex}`}
            data-testid="month-week-row"
            data-week={week.weekIndex}
            className={`card-shadow flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 transition-transform active:scale-[0.99] sm:gap-4 sm:px-5 ${
              week.isCurrent ? "ring-2 ring-accent" : ""
            }`}
          >
            <div className="w-14 shrink-0 sm:w-16">
              <p className="num text-sm font-extrabold tracking-tight text-text">
                Week {week.weekIndex + 1}
              </p>
              {week.isCurrent && (
                <span className="text-[10px] font-bold text-accent-deep">
                  Now
                </span>
              )}
            </div>

            <div className="flex flex-1 justify-between gap-1">
              {week.days.map((day) => (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    data-testid={day.isToday ? "month-today" : undefined}
                    data-level={day.level}
                    title={`${day.date} · ${day.totalHours}h${
                      day.tasksTotal > 0
                        ? ` · ${day.tasksDone}/${day.tasksTotal}`
                        : " · rest"
                    }`}
                    className={`relative flex h-9 w-full items-center justify-center rounded-lg text-[11px] font-bold sm:h-10 ${
                      day.isFuture
                        ? "bg-inset text-sub"
                        : day.isRest
                          ? "bg-cell-0 text-mute"
                          : `${LEVEL_BG[Math.min(day.level, 4)]} ${
                              day.level >= 3 ? "text-white" : "text-text"
                            }`
                    } ${day.isToday ? "ring-2 ring-accent ring-offset-1" : ""}`}
                  >
                    <span className="num">
                      {day.isRest ? "·" : day.totalHours}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-mute">
                    {day.weekdayLetter}
                  </span>
                </div>
              ))}
            </div>

            <div className="w-16 shrink-0 text-right sm:w-20">
              <p className="num text-sm font-bold text-text">
                {Math.round(week.totalHours * 10) / 10}h
              </p>
              {week.tasksTotal > 0 && (
                <p className="num text-[11px] font-semibold text-sub">
                  {week.tasksDone}/{week.tasksTotal} done
                </p>
              )}
            </div>

            <ChevronRightIcon className="size-4 shrink-0 text-mute" />
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-xs font-medium text-mute">
        Each tile shows a day&apos;s planned hours; past days fill in as you
        complete them. Tap a week to edit it.
      </p>
    </div>
  );
}
