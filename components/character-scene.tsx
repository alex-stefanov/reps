"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { SceneDay } from "@/lib/server/home-view";
import type { AvatarState } from "./avatar/builder";

/**
 * The hero: a 3D scene in a glass card. The character lives on the week's
 * 3D path; the capsule strip below mirrors it in DOM (and carries the
 * level classes the e2e suite asserts against).
 */

const AvatarScene = dynamic(() => import("./avatar/avatar-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="size-16 animate-pulse-dot rounded-full bg-cell-1" />
    </div>
  ),
});

const LEVEL_BG = [
  "bg-cell-0",
  "bg-cell-1",
  "bg-cell-2",
  "bg-cell-3",
  "bg-cell-4",
];

function dayLetter(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return "SMTWTFS"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function CharacterScene({
  week,
  todayIndex,
  doneCount,
  totalCount,
  streak,
  justLost,
}: {
  week: SceneDay[];
  todayIndex: number;
  doneCount: number;
  totalCount: number;
  streak: number;
  justLost: boolean;
}) {
  const baseState: AvatarState =
    totalCount > 0 && doneCount >= totalCount
      ? "celebrate"
      : justLost && doneCount === 0
        ? "slump"
        : "idle";

  const [flourishing, setFlourishing] = useState(false);
  const prevDone = useRef(doneCount);

  useEffect(() => {
    if (doneCount > prevDone.current && baseState !== "celebrate") {
      setFlourishing(true);
      const t = setTimeout(() => setFlourishing(false), 1600);
      return () => clearTimeout(t);
    }
    prevDone.current = doneCount;
  }, [doneCount, baseState]);

  useEffect(() => {
    prevDone.current = doneCount;
  }, [doneCount]);

  const state: AvatarState = flourishing ? "flourish" : baseState;

  return (
    <section
      aria-label="Character and current week"
      className="card-shadow-lg relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#eef6ff] via-[#f2f7f3] to-[#e9f7ee]"
    >
      {/* Streak pill */}
      <div className="absolute right-4 top-4 z-10">
        {justLost && streak === 0 ? (
          <span className="glass card-shadow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-danger">
            <span className="size-1.5 rounded-full bg-danger" />
            Streak lost
          </span>
        ) : (
          <span className="glass card-shadow num inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-text">
            <span
              className={`size-1.5 rounded-full ${streak > 0 ? "bg-accent" : "bg-mute"}`}
            />
            {streak} day streak
          </span>
        )}
      </div>

      <div className="h-72 sm:h-80" data-avatar-state={state}>
        <AvatarScene state={state} week={week} todayIndex={todayIndex} />
      </div>

      {/* DOM mirror of the week path */}
      <div className="grid grid-cols-7 gap-1.5 px-5 pb-5">
        {week.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <div
              data-testid={day.isToday ? "today-tile" : undefined}
              data-level={day.level}
              className={`h-2 w-full rounded-full transition-colors duration-500 ${
                day.isFuture
                  ? "bg-cell-0/60"
                  : day.broken
                    ? "bg-[#3a3d45]"
                    : LEVEL_BG[Math.min(day.level, 4)]
              } ${day.isToday ? "ring-2 ring-accent/40 ring-offset-1" : ""}`}
            />
            <span
              className={`num text-[10px] font-bold ${
                day.isToday ? "text-accent-deep" : "text-mute"
              }`}
            >
              {dayLetter(day.date)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
