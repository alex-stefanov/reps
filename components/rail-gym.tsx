"use client";

import { useTransition } from "react";
import { setStandingTaskDone } from "@/lib/server/actions";
import type { TodayTask } from "@/lib/server/day";
import { BarbellIcon } from "./icons";

/** The rail's Gym entry is a one-tap log (spec §6.1). */
export function RailGym({ task }: { task: TodayTask }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={task.done}
      aria-label={task.done ? "Gym logged — undo" : "Log gym"}
      title={task.done ? "Gym logged — tap to undo" : "Log gym"}
      onClick={() =>
        startTransition(async () => {
          await setStandingTaskDone(task.id, !task.done);
        })
      }
      className={`flex size-10 items-center justify-center border transition-colors active:translate-y-px ${
        task.done
          ? "border-phos bg-raised text-phos-bright"
          : "border-line bg-panel text-dim hover:border-line-bright hover:text-fg"
      }`}
    >
      <BarbellIcon className="size-4" />
    </button>
  );
}
