"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  addScheduleTask,
  deleteScheduleTask,
  regenerateProgram,
  setScheduleTasksDone,
  updateDayNote,
  updateScheduleTaskHours,
} from "@/lib/server/actions";
import type { Intensity, Track } from "@/lib/db/schema";
import type { WeekView, WeekViewDay, WeekViewTask } from "@/lib/server/schedule-view";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  RegenerateIcon,
  XIcon,
} from "./icons";

/**
 * The Schedule as iOS day cards — swipe-friendly, tap-to-complete, with an
 * edit mode for hours/tasks/notes, a select mode for bulk completion
 * (spec §8.1's “+ mark as done”), and regeneration in a bottom sheet.
 */

type Mode = "view" | "select" | "edit";

const TRACK_DOT: Record<Track, string> = {
  byox: "bg-track-byox",
  project: "bg-track-project",
  leetcode: "bg-track-leetcode",
  linkedin: "bg-track-linkedin",
};

const TRACK_NAME: Record<Track, string> = {
  byox: "BYOX",
  project: "Project",
  leetcode: "LeetCode",
  linkedin: "LinkedIn",
};

const spring = { type: "spring", stiffness: 400, damping: 30 } as const;

function TaskRow({
  task,
  mode,
  selected,
  locked,
  busy,
  onTap,
  onHours,
  onDelete,
}: {
  task: WeekViewTask;
  mode: Mode;
  selected: boolean;
  /** Future day: plannable (edit mode works), not completable. */
  locked: boolean;
  busy: boolean;
  onTap: () => void;
  onHours: (h: number) => void;
  onDelete: () => void;
}) {
  if (mode === "edit") {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <span className={`size-2.5 shrink-0 rounded-full ${TRACK_DOT[task.track]}`} />
        <span className="flex-1 truncate text-[15px] font-semibold text-text">
          {task.label}
        </span>
        <span className="flex items-center gap-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={busy || task.hours <= 0.5}
            onClick={() => onHours(task.hours - 0.5)}
            aria-label={`Reduce ${task.label} hours`}
            className="num flex size-7 items-center justify-center rounded-full bg-inset text-sm font-bold text-sub disabled:opacity-40"
          >
            −
          </motion.button>
          <span className="num w-11 text-center text-sm font-bold text-text">
            {task.hours}h
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={busy}
            onClick={() => onHours(task.hours + 0.5)}
            aria-label={`Increase ${task.label} hours`}
            className="num flex size-7 items-center justify-center rounded-full bg-inset text-sm font-bold text-sub"
          >
            +
          </motion.button>
        </span>
        {!task.done && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={busy}
            onClick={onDelete}
            aria-label={`Remove ${task.label}`}
            className="flex size-7 items-center justify-center rounded-full bg-inset text-mute hover:text-danger"
          >
            <XIcon className="size-3.5" />
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={locked ? undefined : { scale: 0.98 }}
      disabled={busy || locked}
      onClick={onTap}
      aria-pressed={mode === "select" ? undefined : task.done}
      aria-disabled={locked || undefined}
      data-selected={mode === "select" ? selected : undefined}
      className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
        selected ? "bg-accent-soft" : locked ? "" : "hover:bg-inset"
      } ${locked ? "cursor-default" : ""}`}
    >
      <span
        className={`size-2.5 shrink-0 rounded-full ${TRACK_DOT[task.track]} ${
          locked ? "opacity-50" : ""
        }`}
      />
      <span
        className={`flex-1 truncate text-[15px] font-semibold ${
          task.done ? "text-mute line-through" : locked ? "text-sub" : "text-text"
        }`}
      >
        {task.label}
      </span>
      <span className="num shrink-0 rounded-full bg-inset px-2 py-0.5 text-xs font-bold text-sub">
        {task.hours}h
      </span>
      {locked ? (
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-hair text-mute"
          title="Unlocks on its day"
        >
          <LockIcon className="size-3" />
        </span>
      ) : (
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            mode === "select"
              ? selected
                ? "border-accent bg-accent text-white"
                : "border-hair-strong"
              : task.done
                ? "border-accent bg-accent text-white"
                : "border-hair-strong"
          }`}
        >
          {(mode === "select" ? selected : task.done) && (
            <CheckIcon className="size-3.5" />
          )}
        </span>
      )}
    </motion.button>
  );
}

function DayCard({
  day,
  tracks,
  mode,
  selected,
  busy,
  onTaskTap,
  onHours,
  onDelete,
  onAdd,
  onNote,
}: {
  day: WeekViewDay;
  tracks: Track[];
  mode: Mode;
  selected: Set<string>;
  busy: boolean;
  onTaskTap: (task: WeekViewTask) => void;
  onHours: (id: string, h: number) => void;
  onDelete: (id: string) => void;
  onAdd: (dayId: string, track: Track) => void;
  onNote: (dayId: string, note: string) => void;
}) {
  const missingTracks = tracks.filter(
    (t) => !day.tasks.some((task) => task.track === t),
  );

  return (
    <motion.section
      layout
      transition={spring}
      className={`card-shadow rounded-3xl bg-card p-4 ${
        day.isToday ? "ring-2 ring-accent" : ""
      }`}
    >
      <header className="flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-extrabold tracking-tight text-text">
            {day.weekday}
          </h3>
          <span className="num text-xs font-semibold text-mute">
            {day.date.slice(5).replace("-", "/")}
          </span>
          {day.isToday && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-deep">
              Today
            </span>
          )}
          {day.complete && (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
              <CheckIcon className="size-3" />
              Done
            </span>
          )}
        </div>
        {day.totalHours > 0 && (
          <span className="num text-sm font-bold text-sub">
            {day.totalHours}h
          </span>
        )}
      </header>

      <div className="mt-1 divide-y divide-hair">
        {day.tasks.length === 0 && mode !== "edit" && (
          <p className="px-1 py-3 text-sm font-medium text-mute">
            {day.note ?? "Rest"}
          </p>
        )}
        {day.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            mode={mode}
            selected={selected.has(task.id)}
            locked={day.isFuture}
            busy={busy}
            onTap={() => onTaskTap(task)}
            onHours={(h) => onHours(task.id, h)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>

      {mode === "edit" && (
        <div className="mt-2 border-t border-hair pt-3">
          {missingTracks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {missingTracks.map((track) => (
                <motion.button
                  key={track}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={busy}
                  onClick={() => onAdd(day.id, track)}
                  aria-label={`Add ${TRACK_NAME[track]} to ${day.weekday}`}
                  className="flex items-center gap-1.5 rounded-full bg-inset px-3 py-1.5 text-xs font-bold text-sub hover:text-text"
                >
                  <PlusIcon className="size-3" />
                  <span className={`size-2 rounded-full ${TRACK_DOT[track]}`} />
                  {TRACK_NAME[track]}
                </motion.button>
              ))}
            </div>
          )}
          <input
            defaultValue={day.note ?? ""}
            placeholder="Add a note"
            aria-label={`Note for ${day.weekday}`}
            onBlur={(e) => {
              if (e.target.value !== (day.note ?? "")) {
                onNote(day.id, e.target.value);
              }
            }}
            className="mt-3 w-full rounded-xl bg-inset px-3 py-2 text-sm font-medium text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      )}
      {mode !== "edit" && day.note && day.tasks.length > 0 && (
        <p className="mt-2 px-1 text-xs font-medium text-mute">{day.note}</p>
      )}
    </motion.section>
  );
}

export function ScheduleScreen({
  week,
  hoursPerWeek,
  intensity,
}: {
  week: WeekView;
  hoursPerWeek: number;
  intensity: Intensity;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  const exitSelect = () => {
    setSelected(new Set());
    setMode("view");
  };

  const onTaskTap = (task: WeekViewTask) => {
    if (mode === "select") {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(task.id)) next.delete(task.id);
        else next.add(task.id);
        return next;
      });
      return;
    }
    startTransition(() => setScheduleTasksDone([task.id], !task.done));
  };

  const applySelection = (done: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return exitSelect();
    startTransition(async () => {
      await setScheduleTasksDone(ids, done);
      exitSelect();
    });
  };

  const pill = (active: boolean, onClick: () => void, label: string, icon: React.ReactNode) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
        active
          ? "bg-text text-card"
          : "card-shadow bg-card text-sub hover:text-text"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );

  return (
    <div className="pb-28">
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
              {hoursPerWeek}h / week · {intensity}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {pill(mode === "select", () => (mode === "select" ? exitSelect() : setMode("select")), "Select", <PlusIcon className="size-3.5" />)}
          {pill(mode === "edit", () => setMode(mode === "edit" ? "view" : "edit"), "Edit", <PencilIcon className="size-3.5" />)}
        </div>
      </header>

      {/* Week pager */}
      <nav
        aria-label="Week"
        className="card-shadow mx-auto mt-5 flex w-fit items-center gap-1 rounded-full bg-card p-1"
      >
        <Link
          href={`/schedule?w=${week.weekIndex - 1}`}
          aria-disabled={week.weekIndex === 0}
          className={`flex size-8 items-center justify-center rounded-full text-sub hover:bg-inset ${
            week.weekIndex === 0 ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <ChevronLeftIcon className="size-3.5" />
        </Link>
        <span className="num px-3 text-sm font-bold text-text">
          Week {week.weekIndex + 1}
          <span className="font-semibold text-mute"> of {week.totalWeeks}</span>
        </span>
        <Link
          href={`/schedule?w=${week.weekIndex + 1}`}
          aria-disabled={week.weekIndex >= week.totalWeeks - 1}
          className={`flex size-8 items-center justify-center rounded-full text-sub hover:bg-inset ${
            week.weekIndex >= week.totalWeeks - 1 ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <ChevronRightIcon className="size-3.5" />
        </Link>
        {week.weekIndex !== week.currentWeekIndex && (
          <Link
            href={`/schedule?w=${week.currentWeekIndex}`}
            className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-deep"
          >
            Today
          </Link>
        )}
      </nav>

      {/* Day cards */}
      <motion.div
        data-testid="schedule-grid"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {week.days.map((day) => (
          <motion.div
            key={day.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: spring },
            }}
          >
            <DayCard
              day={day}
              tracks={week.tracks}
              mode={mode}
              selected={selected}
              busy={busy}
              onTaskTap={onTaskTap}
              onHours={(id, h) =>
                startTransition(() => updateScheduleTaskHours(id, h))
              }
              onDelete={(id) => startTransition(() => deleteScheduleTask(id))}
              onAdd={(dayId, track) =>
                startTransition(() => addScheduleTask(dayId, track))
              }
              onNote={(dayId, note) =>
                startTransition(() => updateDayNote(dayId, note))
              }
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Regenerate entry */}
      <div className="mt-6 flex justify-center">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setSheetOpen(true)}
          className="card-shadow flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-xs font-bold text-sub hover:text-text"
        >
          <RegenerateIcon className="size-3.5" />
          Regenerate program
        </motion.button>
      </div>

      {/* Select-mode floating bar */}
      <AnimatePresence>
        {mode === "select" && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={spring}
            className="glass card-shadow-lg fixed inset-x-4 bottom-5 z-20 mx-auto flex max-w-md items-center gap-2 rounded-full px-4 py-2.5"
          >
            <span className="num text-sm font-bold text-text">
              {selected.size} selected
            </span>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => applySelection(true)}
              className="ml-auto rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40 active:scale-95"
            >
              Mark done
            </button>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => applySelection(false)}
              className="rounded-full bg-inset px-3.5 py-2 text-xs font-bold text-sub disabled:opacity-40 active:scale-95"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={exitSelect}
              aria-label="Cancel selection"
              className="flex size-8 items-center justify-center rounded-full text-mute hover:text-text"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-30 bg-text/30"
            />
            <motion.div
              role="dialog"
              aria-label="Regenerate program"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[2rem] bg-card p-6 pb-8 card-shadow-lg"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-hair-strong" />
              <h2 className="mt-4 text-xl font-extrabold tracking-tight text-text">
                Regenerate program
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-sub">
                Replaces the plan from today with new parameters. Everything
                you&apos;ve completed stays.
              </p>
              <form action={regenerateProgram} className="mt-5 flex flex-col gap-4">
                <label className="text-sm font-bold text-text">
                  Hours / week
                  <input
                    type="number"
                    name="hoursPerWeek"
                    min={4}
                    max={40}
                    defaultValue={hoursPerWeek}
                    className="num mt-1.5 block w-full rounded-xl bg-inset px-3.5 py-3 text-base font-bold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </label>
                <fieldset>
                  <legend className="text-sm font-bold text-text">Intensity</legend>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-inset p-1">
                    {(["chill", "steady", "grind"] as const).map((option) => (
                      <label key={option} className="cursor-pointer">
                        <input
                          type="radio"
                          name="intensity"
                          value={option}
                          defaultChecked={option === intensity}
                          className="peer sr-only"
                        />
                        <span className="block rounded-lg py-2 text-center text-sm font-bold capitalize text-sub transition-colors peer-checked:bg-card peer-checked:text-text peer-checked:card-shadow">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="submit"
                  className="mt-1 rounded-2xl bg-text py-3.5 text-[15px] font-bold text-card active:scale-[0.98]"
                >
                  Regenerate
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
