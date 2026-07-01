"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneDay } from "@/lib/server/home-view";
import { PixelSprite, type SpriteState } from "./pixel-sprite";

/**
 * The signature scene: the character lives ON the contribution grid.
 * The current program week is the floor — seven tiles, today underfoot.
 * Completing tasks ignites today's tile; the streak is the lit path
 * behind the sprite; a broken day is a visible gap in the floor.
 */

const LEVEL_BG = [
  "bg-cell-0",
  "bg-cell-1",
  "bg-cell-2",
  "bg-cell-3",
  "bg-cell-4",
];

/** Program weeks start on Day 1's weekday, not Monday — label from the date. */
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
  const baseState: SpriteState =
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
      const t = setTimeout(() => setFlourishing(false), 1400);
      return () => clearTimeout(t);
    }
    prevDone.current = doneCount;
  }, [doneCount, baseState]);

  useEffect(() => {
    prevDone.current = doneCount;
  }, [doneCount]);

  const spriteState: SpriteState = flourishing ? "flourish" : baseState;
  const spriteCol = todayIndex >= 0 ? todayIndex : 6;

  return (
    <section
      aria-label="Character and current week"
      className="scanlines relative overflow-hidden border border-line bg-panel"
    >
      {/* Streak chip */}
      <div className="absolute right-3 top-3 z-10 text-right">
        {justLost && streak === 0 ? (
          <span className="font-pixel text-[10px] tracking-wider text-danger">
            STREAK LOST
          </span>
        ) : (
          <span className="font-pixel text-[10px] tracking-wider text-dim">
            STREAK{" "}
            <span className={streak > 0 ? "text-phos-bright" : "text-faint"}>
              {streak}
            </span>
          </span>
        )}
      </div>

      {/* Horizon glow behind the sprite */}
      <div
        className="pointer-events-none absolute bottom-10 h-24 w-40 -translate-x-1/2 rounded-full opacity-25 blur-2xl"
        style={{
          left: `${((spriteCol + 0.5) / 7) * 100}%`,
          background:
            "radial-gradient(closest-side, var(--color-phos) 0%, transparent 75%)",
        }}
      />

      <div className="relative h-44">
        {/* Sprite above today's tile */}
        <div
          className={`absolute bottom-[3.1rem] w-16 -translate-x-1/2 transition-[left] duration-500 ${
            flourishing ? "animate-hop" : ""
          }`}
          style={{
            left: `clamp(2.25rem, ${((spriteCol + 0.5) / 7) * 100}%, calc(100% - 2.25rem))`,
          }}
        >
          <PixelSprite state={spriteState} className="h-20 w-16" />
        </div>

        {/* The week as floor tiles */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-7">
          {week.map((day) => {
            const lit = LEVEL_BG[Math.min(day.level, 4)];
            return (
              <div key={day.date} className="flex flex-col">
                {/* top face */}
                <div
                  key={`${day.date}-${day.level}`}
                  data-testid={day.isToday ? "today-tile" : undefined}
                  className={`h-7 border-r border-ink/60 last:border-r-0 ${
                    day.isFuture
                      ? "bg-cell-0/50"
                      : day.broken
                        ? "bg-ink shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)]"
                        : lit
                  } ${day.isToday && day.level > 0 ? "animate-ignite" : ""} ${
                    day.isToday
                      ? "shadow-[0_-6px_18px_-4px_var(--color-phos-dim)]"
                      : ""
                  }`}
                />
                {/* front edge */}
                <div
                  className={`h-2.5 ${
                    day.broken ? "bg-ink" : "bg-raised"
                  } border-r border-ink/60 last:border-r-0`}
                />
                <div
                  className={`num py-1 text-center text-[10px] ${
                    day.isToday ? "text-phos-bright" : "text-faint"
                  }`}
                >
                  {dayLetter(day.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
