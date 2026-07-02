"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTransition } from "react";
import { setStandingTaskDone } from "@/lib/server/actions";
import type { TodayTask } from "@/lib/server/day";
import {
  BarbellIcon,
  BookIcon,
  BulbIcon,
  CheckIcon,
  CoinIcon,
} from "./icons";

/**
 * The hubs as a home-screen row of app-style squircles: Finance, Ideas,
 * Tutorials (Phase 2 doors) and the one-tap Gym log (spec §6.1).
 */

function Squircle({
  label,
  children,
  href,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <motion.span
      whileTap={{ scale: 0.92 }}
      className="card-shadow flex size-14 items-center justify-center rounded-[1.2rem] bg-card text-sub transition-colors hover:text-text"
    >
      {children}
    </motion.span>
  );
  return (
    <span className="flex flex-col items-center gap-1.5">
      {href ? (
        <Link href={href} aria-label={label}>
          {inner}
        </Link>
      ) : (
        inner
      )}
      <span className="text-[11px] font-semibold text-sub">{label}</span>
    </span>
  );
}

export function HubRow({ gymTask }: { gymTask?: TodayTask }) {
  const [busy, startTransition] = useTransition();

  return (
    <nav aria-label="Hubs" className="flex items-start justify-between px-2">
      <Squircle label="Finance" href="/finance">
        <CoinIcon className="size-5" />
      </Squircle>

      {gymTask && (
        <span className="flex flex-col items-center gap-1.5">
          <motion.button
            type="button"
            disabled={busy}
            whileTap={{ scale: 0.92 }}
            aria-pressed={gymTask.done}
            aria-label={gymTask.done ? "Gym logged — undo" : "Log gym"}
            onClick={() =>
              startTransition(async () => {
                await setStandingTaskDone(gymTask.id, !gymTask.done);
              })
            }
            className={`card-shadow relative flex size-14 items-center justify-center rounded-[1.2rem] transition-colors ${
              gymTask.done
                ? "bg-track-gym text-white"
                : "bg-card text-sub hover:text-text"
            }`}
          >
            <BarbellIcon className="size-5" />
            {gymTask.done && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-base">
                <CheckIcon className="size-3" />
              </span>
            )}
          </motion.button>
          <span className="text-[11px] font-semibold text-sub">Gym</span>
        </span>
      )}

      <Squircle label="Ideas" href="/ideas">
        <BulbIcon className="size-5" />
      </Squircle>

      <Squircle label="Tutorials" href="/tutorials">
        <BookIcon className="size-5" />
      </Squircle>
    </nav>
  );
}
