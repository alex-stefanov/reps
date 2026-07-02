"use client";

import { motion } from "framer-motion";

/**
 * The daily "1/3" as an Apple-Fitness-style ring. Closing the ring is
 * completing the day — same number, real stakes.
 */
export function CompletionRing({
  done,
  total,
  size = 88,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(done / total, 1) : 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${done} of ${total} tasks done today`}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#30d158" />
            <stop offset="100%" stopColor="#30b0c7" />
          </linearGradient>
        </defs>
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--color-cell-0)"
          strokeWidth="9"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-extrabold leading-none text-text">
          <span data-testid="done-count">{done}</span>
          <span className="text-mute">/{total}</span>
        </span>
      </div>
    </div>
  );
}
