"use client";

import { useState, useTransition } from "react";
import {
  addScheduleTask,
  deleteScheduleTask,
  setScheduleTasksDone,
  updateDayNote,
  updateScheduleTaskHours,
} from "@/lib/server/actions";
import type { Track } from "@/lib/db/schema";
import type { WeekView, WeekViewTask } from "@/lib/server/schedule-view";
import { CheckIcon, PlusIcon, XIcon } from "./icons";

/**
 * The landscape week grid (spec §8.1). Three modes:
 *  view   — tap a task to toggle it done (Home mirrors it instantly)
 *  select — the sketch's “+ mark as done (select items)” bulk flow
 *  edit   — the pencil: hours steppers, add/remove tasks, notes
 */

export type GridMode = "view" | "select" | "edit";

const TRACK_HEADER: Record<Track, string> = {
  byox: "BYOX",
  project: "PROJECT",
  leetcode: "LEETCODE",
  linkedin: "LINKEDIN",
};

const TRACK_TEXT: Record<Track, string> = {
  byox: "text-track-byox",
  project: "text-track-project",
  leetcode: "text-track-leetcode",
  linkedin: "text-track-linkedin",
};

export function ScheduleGrid({
  week,
  mode,
  onModeHandled,
}: {
  week: WeekView;
  mode: GridMode;
  onModeHandled: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const exitSelect = () => {
    setSelected(new Set());
    onModeHandled();
  };

  const applySelection = (done: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return exitSelect();
    startTransition(async () => {
      await setScheduleTasksDone(ids, done);
      exitSelect();
    });
  };

  const onTaskClick = (task: WeekViewTask) => {
    if (mode === "select") {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(task.id)) next.delete(task.id);
        else next.add(task.id);
        return next;
      });
      return;
    }
    if (mode === "view") {
      startTransition(() => setScheduleTasksDone([task.id], !task.done));
    }
  };

  const gridTemplate = {
    gridTemplateColumns: `88px repeat(${week.tracks.length}, minmax(96px, 1fr)) 56px minmax(120px, 1.2fr)`,
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div className="min-w-[720px] border border-line" data-testid="schedule-grid">
          {/* Header row */}
          <div
            className="num grid items-center border-b border-line-bright bg-panel text-[11px] tracking-wider text-dim"
            style={gridTemplate}
          >
            <div className="px-3 py-2">DAY</div>
            {week.tracks.map((track) => (
              <div key={track} className={`px-3 py-2 ${TRACK_TEXT[track]}`}>
                {TRACK_HEADER[track]} <span className="text-faint">+H</span>
              </div>
            ))}
            <div className="px-3 py-2 text-right">TH</div>
            <div className="px-3 py-2">NOTE</div>
          </div>

          {week.days.map((day) => (
            <div
              key={day.id}
              className={`grid items-stretch border-b border-line last:border-b-0 ${
                day.isToday ? "bg-raised/60" : ""
              }`}
              style={gridTemplate}
            >
              {/* Day cell */}
              <div
                className={`flex flex-col justify-center border-r border-line px-3 py-2 ${
                  day.isToday ? "border-l-2 border-l-phos" : ""
                }`}
              >
                <span
                  className={`text-sm ${day.isToday ? "text-phos-bright" : "text-fg"}`}
                >
                  {day.weekday}
                </span>
                <span className="num text-[11px] text-faint">
                  {day.date.slice(5).replace("-", "/")}
                </span>
              </div>

              {/* Track cells */}
              {week.tracks.map((track) => {
                const task = day.tasks.find((t) => t.track === track);
                if (!task) {
                  return (
                    <div
                      key={track}
                      className="flex items-center border-r border-line px-3 py-2"
                    >
                      {mode === "edit" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => addScheduleTask(day.id, track))
                          }
                          className="flex items-center gap-1 text-xs text-faint hover:text-fg"
                          aria-label={`Add ${track} to ${day.weekday}`}
                        >
                          <PlusIcon className="size-3" /> add
                        </button>
                      ) : (
                        <span className="text-faint">·</span>
                      )}
                    </div>
                  );
                }

                const isSelected = selected.has(task.id);
                return (
                  <div
                    key={track}
                    className="flex items-center gap-2 border-r border-line px-2 py-2"
                  >
                    {mode === "edit" ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pending || task.hours <= 0.5}
                          onClick={() =>
                            startTransition(() =>
                              updateScheduleTaskHours(task.id, task.hours - 0.5),
                            )
                          }
                          className="num border border-line px-1.5 text-xs text-dim hover:border-line-bright disabled:opacity-40"
                          aria-label="Reduce hours"
                        >
                          −
                        </button>
                        <span className={`num text-sm ${TRACK_TEXT[task.track]}`}>
                          {task.hours}h
                        </span>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() =>
                              updateScheduleTaskHours(task.id, task.hours + 0.5),
                            )
                          }
                          className="num border border-line px-1.5 text-xs text-dim hover:border-line-bright"
                          aria-label="Increase hours"
                        >
                          +
                        </button>
                        {!task.done && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              startTransition(() => deleteScheduleTask(task.id))
                            }
                            className="ml-1 text-faint hover:text-danger"
                            aria-label={`Remove ${track} from ${day.weekday}`}
                          >
                            <XIcon className="size-3" />
                          </button>
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onTaskClick(task)}
                        aria-pressed={mode === "select" ? isSelected : task.done}
                        className={`flex w-full items-center gap-2 px-1 py-1 text-left transition-colors ${
                          isSelected ? "bg-phos-dim/30 outline outline-1 outline-phos" : ""
                        } hover:bg-raised active:translate-y-px`}
                      >
                        <span
                          className={`flex size-3.5 shrink-0 items-center justify-center border ${
                            task.done
                              ? "border-phos bg-phos text-ink"
                              : "border-line-bright"
                          }`}
                        >
                          {task.done && <CheckIcon className="size-2.5" />}
                        </span>
                        <span
                          className={`num text-sm ${
                            task.done ? "text-phos-bright" : TRACK_TEXT[task.track]
                          }`}
                        >
                          {task.hours}h
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Th (daily total) */}
              <div className="num flex items-center justify-end border-r border-line px-3 py-2 text-sm">
                <span className={day.totalHours > 0 ? "text-fg" : "text-faint"}>
                  {day.totalHours > 0 ? `${day.totalHours}h` : "—"}
                </span>
              </div>

              {/* Note */}
              <div className="flex items-center px-3 py-2">
                {mode === "edit" ? (
                  <input
                    defaultValue={day.note ?? ""}
                    placeholder="note"
                    onBlur={(e) => {
                      if (e.target.value !== (day.note ?? "")) {
                        startTransition(() =>
                          updateDayNote(day.id, e.target.value),
                        );
                      }
                    }}
                    className="w-full border border-line bg-panel px-2 py-1 text-xs text-fg placeholder:text-faint focus:border-phos-dim focus:outline-none"
                    aria-label={`Note for ${day.weekday}`}
                  />
                ) : (
                  <span className="truncate text-xs text-dim">
                    {day.note ?? ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Select-mode apply bar */}
      {mode === "select" && (
        <div className="sticky bottom-4 mt-4 flex items-center gap-3 border border-line-bright bg-panel px-4 py-3">
          <span className="num text-sm text-phos-bright">
            {selected.size} selected
          </span>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => applySelection(true)}
            className="border border-phos-dim px-3 py-1.5 text-sm text-phos-bright hover:border-phos disabled:opacity-40 active:translate-y-px"
          >
            Mark done
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => applySelection(false)}
            className="border border-line px-3 py-1.5 text-sm text-dim hover:border-line-bright disabled:opacity-40 active:translate-y-px"
          >
            Mark not done
          </button>
          <button
            type="button"
            onClick={exitSelect}
            className="ml-auto text-sm text-faint hover:text-fg"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
