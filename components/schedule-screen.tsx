"use client";

import Link from "next/link";
import { useState } from "react";
import { regenerateProgram } from "@/lib/server/actions";
import type { Intensity } from "@/lib/db/schema";
import type { WeekView } from "@/lib/server/schedule-view";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  RegenerateIcon,
} from "./icons";
import { ScheduleGrid, type GridMode } from "./schedule-grid";

export function ScheduleScreen({
  week,
  hoursPerWeek,
  intensity,
}: {
  week: WeekView;
  hoursPerWeek: number;
  intensity: Intensity;
}) {
  const [mode, setMode] = useState<GridMode>("view");
  const [regenOpen, setRegenOpen] = useState(false);

  const modeButton = (
    target: GridMode,
    icon: React.ReactNode,
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => setMode(mode === target ? "view" : target)}
      aria-pressed={mode === target}
      className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors active:translate-y-px ${
        mode === target
          ? "border-phos bg-raised text-phos-bright"
          : "border-line text-dim hover:border-line-bright hover:text-fg"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href="/"
          className="num text-xs text-dim transition-colors hover:text-phos-bright"
        >
          ‹ HOME
        </Link>
        <h1 className="font-pixel text-lg tracking-wider text-phos">
          SCHEDULE
        </h1>
        <span className="num text-xs text-faint">
          {hoursPerWeek}h/wk · {intensity}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Week carousel */}
          <nav className="num flex items-center gap-1 text-sm" aria-label="Week">
            <Link
              href={`/schedule?w=${week.weekIndex - 1}`}
              aria-disabled={week.weekIndex === 0}
              className={`border border-line p-1.5 hover:border-line-bright ${
                week.weekIndex === 0 ? "pointer-events-none opacity-30" : ""
              }`}
            >
              <ChevronLeftIcon className="size-3.5" />
            </Link>
            <span className="px-2 text-fg">
              W{week.weekIndex + 1}
              <span className="text-faint"> / {week.totalWeeks}</span>
            </span>
            <Link
              href={`/schedule?w=${week.weekIndex + 1}`}
              aria-disabled={week.weekIndex >= week.totalWeeks - 1}
              className={`border border-line p-1.5 hover:border-line-bright ${
                week.weekIndex >= week.totalWeeks - 1
                  ? "pointer-events-none opacity-30"
                  : ""
              }`}
            >
              <ChevronRightIcon className="size-3.5" />
            </Link>
            {week.weekIndex !== week.currentWeekIndex && (
              <Link
                href={`/schedule?w=${week.currentWeekIndex}`}
                className="ml-1 text-xs text-phos hover:text-phos-bright"
              >
                today
              </Link>
            )}
          </nav>

          {modeButton("select", <PlusIcon className="size-3.5" />, "Select")}
          {modeButton("edit", <PencilIcon className="size-3.5" />, "Edit")}
          <button
            type="button"
            onClick={() => setRegenOpen((v) => !v)}
            aria-expanded={regenOpen}
            className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-dim transition-colors hover:border-line-bright hover:text-fg active:translate-y-px"
          >
            <RegenerateIcon className="size-3.5" />
            Regenerate
          </button>
        </div>
      </header>

      {regenOpen && (
        <form
          action={regenerateProgram}
          className="mt-4 flex flex-wrap items-end gap-4 border border-warn/40 bg-panel px-4 py-3"
        >
          <p className="w-full text-xs leading-relaxed text-dim">
            Regenerating replaces the whole plan from today with new
            parameters. Completed history stays.
          </p>
          <label className="text-xs text-dim">
            Hours / week
            <input
              type="number"
              name="hoursPerWeek"
              min={4}
              max={40}
              defaultValue={hoursPerWeek}
              className="num mt-1 block w-24 border border-line bg-ink px-2 py-1.5 text-sm text-fg focus:border-phos-dim focus:outline-none"
            />
          </label>
          <label className="text-xs text-dim">
            Intensity
            <select
              name="intensity"
              defaultValue={intensity}
              className="mt-1 block border border-line bg-ink px-2 py-1.5 text-sm text-fg focus:border-phos-dim focus:outline-none"
            >
              <option value="chill">chill</option>
              <option value="steady">steady</option>
              <option value="grind">grind</option>
            </select>
          </label>
          <button
            type="submit"
            className="border border-warn/60 px-3 py-1.5 text-sm text-warn hover:border-warn active:translate-y-px"
          >
            Regenerate program
          </button>
          <button
            type="button"
            onClick={() => setRegenOpen(false)}
            className="text-sm text-faint hover:text-fg"
          >
            Cancel
          </button>
        </form>
      )}

      <p className="mt-3 hidden text-xs text-faint portrait:block md:portrait:hidden">
        Rotate your phone — the Schedule is a landscape screen.
      </p>

      <div className="mt-4">
        <ScheduleGrid
          week={week}
          mode={mode}
          onModeHandled={() => setMode("view")}
        />
      </div>
    </div>
  );
}
