"use client";

import { useState, useTransition } from "react";
import {
  setScheduleTaskDone,
  setStandingTaskDone,
} from "@/lib/server/actions";
import type { TodayTask } from "@/lib/server/day";
import type { VerificationState } from "@/lib/server/home-view";
import { CheckIcon } from "./icons";

const TRACK_BORDER: Record<string, string> = {
  byox: "border-l-track-byox",
  project: "border-l-track-project",
  leetcode: "border-l-track-leetcode",
  linkedin: "border-l-track-linkedin",
  gym: "border-l-track-gym",
  commit: "border-l-track-commit",
};

export function TaskBlobs({
  tasks,
  verification,
}: {
  tasks: TodayTask[];
  verification: {
    state: VerificationState;
    commitRef: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [refusedId, setRefusedId] = useState<string | null>(null);

  const onToggle = (task: TodayTask) => {
    if (task.verificationGated) {
      // Spec §13: no manual override while the daily-commit setting is on.
      setRefusedId(task.id);
      setTimeout(() => setRefusedId(null), 1600);
      return;
    }
    startTransition(async () => {
      if (task.kind === "schedule") {
        await setScheduleTaskDone(task.id, !task.done);
      } else {
        await setStandingTaskDone(task.id, !task.done);
      }
    });
  };

  if (tasks.length === 0) {
    return (
      <p className="border border-line bg-panel px-4 py-6 text-center text-sm text-dim">
        Rest day. The grid forgives — the streak survives.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="task-blobs">
      {tasks.map((task) => {
        const isCommit = task.kind === "standing" && task.track === "commit";
        return (
          <li key={task.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => onToggle(task)}
              data-testid={`task-${task.track}`}
              aria-pressed={task.done}
              className={`flex w-full items-center gap-3 border border-line border-l-2 px-3 py-2.5 text-left transition-colors hover:border-line-bright active:translate-y-px ${
                TRACK_BORDER[task.track] ?? "border-l-line"
              } ${task.done ? "bg-raised" : "bg-panel"} ${
                refusedId === task.id ? "animate-refuse" : ""
              }`}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center border ${
                  task.done
                    ? "border-phos bg-phos text-ink"
                    : isCommit && verification.state === "pending"
                      ? "border-warn"
                      : "border-line-bright"
                }`}
              >
                {task.done && <CheckIcon className="size-3" />}
                {!task.done && isCommit && verification.state === "pending" && (
                  <span className="size-1.5 bg-warn animate-pulse-dot" />
                )}
              </span>

              <span
                className={`flex-1 text-sm ${
                  task.done ? "text-dim line-through decoration-phos-dim" : "text-fg"
                }`}
              >
                {task.label}
              </span>

              {isCommit ? (
                <span className="num text-right text-[11px] leading-tight">
                  {task.done && task.verified && (
                    <span className="text-phos">
                      verified
                      {verification.commitRef && (
                        <span className="block text-faint">
                          {verification.commitRef}
                        </span>
                      )}
                    </span>
                  )}
                  {!task.done && verification.state === "pending" && (
                    <span className="text-warn">
                      awaiting
                      <span className="block text-faint">public commit</span>
                    </span>
                  )}
                  {!task.done && verification.state === "unavailable" && (
                    <span className="text-dim">
                      GitHub
                      <span className="block text-faint">unreachable</span>
                    </span>
                  )}
                </span>
              ) : (
                task.hours !== null && (
                  <span className="num text-xs text-faint">{task.hours}h</span>
                )
              )}
            </button>
            {refusedId === task.id && (
              <p className="num mt-1 px-3 text-[11px] text-warn" role="status">
                Commit checks itself off — push a public commit.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
