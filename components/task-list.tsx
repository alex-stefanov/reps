"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import {
  setScheduleTaskDone,
  setStandingTaskDone,
} from "@/lib/server/actions";
import type { TodayTask } from "@/lib/server/day";
import type { VerificationState } from "@/lib/server/home-view";
import {
  BarbellIcon,
  CheckIcon,
  CodeIcon,
  CommitIcon,
  HammerIcon,
  PuzzleIcon,
  ShareIcon,
} from "./icons";

/**
 * Today's tasks as an iOS inset grouped list. Each row: colored squircle
 * icon, label, hours, and a spring-loaded check circle. The Commit row
 * renders its verification state and refuses manual checks (spec §13).
 */

const TRACK_META: Record<
  string,
  { bg: string; icon: React.ReactNode }
> = {
  byox: { bg: "bg-track-byox", icon: <CodeIcon className="size-4" /> },
  project: { bg: "bg-track-project", icon: <HammerIcon className="size-4" /> },
  leetcode: {
    bg: "bg-track-leetcode",
    icon: <PuzzleIcon className="size-4" />,
  },
  linkedin: {
    bg: "bg-track-linkedin",
    icon: <ShareIcon className="size-4" />,
  },
  gym: { bg: "bg-track-gym", icon: <BarbellIcon className="size-4" /> },
  commit: { bg: "bg-track-commit", icon: <CommitIcon className="size-4" /> },
};

function CheckCircle({
  done,
  pending,
}: {
  done: boolean;
  pending: boolean;
}) {
  return (
    <motion.span
      animate={{ scale: done ? [1, 1.3, 1] : 1 }}
      transition={{ duration: 0.4, times: [0, 0.45, 1], ease: "easeOut" }}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        done
          ? "border-accent bg-accent text-white"
          : pending
            ? "border-warn"
            : "border-hair-strong bg-card"
      }`}
    >
      {done && <CheckIcon className="size-4" />}
      {!done && pending && (
        <span className="size-2 animate-pulse-dot rounded-full bg-warn" />
      )}
    </motion.span>
  );
}

export function TaskList({
  tasks,
  verification,
}: {
  tasks: TodayTask[];
  verification: {
    state: VerificationState;
    commitRef: string | null;
  };
}) {
  const [busy, startTransition] = useTransition();
  const [refusedId, setRefusedId] = useState<string | null>(null);

  const onToggle = (task: TodayTask) => {
    if (task.verificationGated) {
      setRefusedId(task.id);
      setTimeout(() => setRefusedId(null), 1800);
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
      <div className="card-shadow rounded-3xl bg-card px-6 py-10 text-center">
        <p className="text-sm font-semibold text-text">Rest day</p>
        <p className="mt-1 text-sm text-sub">
          The path forgives — your streak survives.
        </p>
      </div>
    );
  }

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="card-shadow divide-y divide-hair overflow-hidden rounded-3xl bg-card"
      data-testid="task-blobs"
    >
      {tasks.map((task) => {
        const meta = TRACK_META[task.track] ?? TRACK_META.byox;
        const isCommit = task.kind === "standing" && task.track === "commit";
        const commitPending = isCommit && !task.done;
        return (
          <motion.li
            key={task.id}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: {
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 300, damping: 24 },
              },
            }}
          >
            <motion.button
              type="button"
              disabled={busy}
              onClick={() => onToggle(task)}
              whileTap={{ scale: 0.98 }}
              data-testid={`task-${task.track}`}
              aria-pressed={task.done}
              className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-inset ${
                refusedId === task.id ? "animate-refuse" : ""
              }`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${meta.bg}`}
              >
                {meta.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[15px] font-semibold ${
                    task.done ? "text-mute line-through" : "text-text"
                  }`}
                >
                  {task.label}
                </span>
                {isCommit && (
                  <span className="num block text-xs">
                    {task.done && task.verified && (
                      <span className="font-semibold text-accent-deep">
                        Verified{" "}
                        {verification.commitRef && (
                          <span className="text-mute">
                            · {verification.commitRef}
                          </span>
                        )}
                      </span>
                    )}
                    {!task.done && verification.state === "pending" && (
                      <span className="font-semibold text-warn">
                        Awaiting a public commit
                      </span>
                    )}
                    {!task.done && verification.state === "unavailable" && (
                      <span className="font-semibold text-mute">
                        GitHub unreachable — will retry
                      </span>
                    )}
                  </span>
                )}
              </span>

              {task.hours !== null && (
                <span className="num shrink-0 rounded-full bg-inset px-2.5 py-1 text-xs font-bold text-sub">
                  {task.hours}h
                </span>
              )}

              <CheckCircle done={task.done} pending={commitPending} />
            </motion.button>
            {refusedId === task.id && (
              <p
                className="px-4 pb-3 text-xs font-semibold text-warn"
                role="status"
              >
                Commit checks itself off — push a public commit.
              </p>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
