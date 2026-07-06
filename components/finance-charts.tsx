"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  bucketSeries,
  formatEuros,
  periodBuckets,
  type EntryLike,
  type FinanceDirection,
  type Period,
  type Totals,
} from "@/lib/core/finance";

/**
 * The two bar charts (spec §7.1), hand-built from divs + springs so they
 * speak Clay & Glass instead of chart-library dialect. Income is the hero
 * green; spending is indigo — growth framing, not budget-guilt red.
 */

const spring = { type: "spring" as const, stiffness: 260, damping: 28 };

/** Total Spending vs total Income for the selected period. */
export function TotalsChart({ totals }: { totals: Totals }) {
  const max = Math.max(totals.incomeCents, totals.spendingCents, 1);
  const bars = [
    {
      key: "income",
      label: "Income",
      cents: totals.incomeCents,
      testid: "total-income",
      barClass: "bg-income",
      textClass: "text-accent-deep",
    },
    {
      key: "spending",
      label: "Spending",
      cents: totals.spendingCents,
      testid: "total-spending",
      barClass: "bg-spend",
      textClass: "text-spend",
    },
  ];

  return (
    <div className="card-shadow rounded-3xl bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-extrabold tracking-tight text-text">
          In vs out
        </h2>
        <p
          data-testid="total-net"
          className={`num text-sm font-extrabold ${
            totals.netCents >= 0 ? "text-accent-deep" : "text-warn"
          }`}
        >
          {formatEuros(totals.netCents, { sign: true })} net
        </p>
      </div>

      <div className="mt-4 flex items-end justify-center gap-10">
        {bars.map((bar) => (
          <div key={bar.key} className="flex w-24 flex-col items-center gap-2">
            <p className={`num text-[15px] font-extrabold ${bar.textClass}`}>
              <span data-testid={bar.testid}>{formatEuros(bar.cents)}</span>
            </p>
            <div className="flex h-36 w-full items-end justify-center rounded-2xl bg-inset px-6 pt-2">
              <motion.div
                initial={false}
                animate={{ height: `${Math.max((bar.cents / max) * 100, bar.cents > 0 ? 4 : 0)}%` }}
                transition={spring}
                className={`w-full rounded-t-lg ${bar.barClass}`}
              />
            </div>
            <p className="text-xs font-bold text-sub">{bar.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Per-day (or per-month) bars, sub-toggled between Income and Spending. */
export function BreakdownChart({
  entries,
  period,
}: {
  entries: EntryLike[];
  period: Period;
}) {
  const [direction, setDirection] = useState<FinanceDirection>("spending");
  const buckets = periodBuckets(period);
  const series = bucketSeries(entries, buckets, direction);
  const max = Math.max(...series, 1);
  const empty = series.every((v) => v === 0);
  // Month view has ~31 bars — label roughly every fifth axis tick.
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 8));
  const isIncome = direction === "income";

  return (
    <div className="card-shadow rounded-3xl bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold tracking-tight text-text">
          Breakdown
        </h2>
        <div className="flex rounded-xl bg-inset p-0.5" role="tablist" aria-label="Breakdown direction">
          {(["income", "spending"] as const).map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={direction === d}
              data-testid={`breakdown-${d}`}
              onClick={() => setDirection(d)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                direction === d
                  ? `bg-card text-text shadow-sm ${d === "income" ? "text-accent-deep" : "text-spend"}`
                  : "text-sub hover:text-text"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <div
          data-testid="breakdown-bars"
          className="flex h-32 items-end gap-[3px]"
        >
          {series.map((cents, i) => (
            <div
              key={`${period.start}-${i}`}
              className="group relative flex-1"
              title={cents > 0 ? formatEuros(cents) : undefined}
            >
              <motion.div
                initial={false}
                animate={{ height: `${Math.max((cents / max) * 100, cents > 0 ? 4 : 1.5)}%` }}
                transition={spring}
                className={`w-full rounded-t-[3px] ${
                  cents > 0
                    ? isIncome
                      ? "bg-income"
                      : "bg-spend"
                    : "bg-inset"
                }`}
                style={{ minHeight: 2 }}
              />
            </div>
          ))}
        </div>
        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-mute">
            Nothing {isIncome ? "earned" : "spent"} in this period yet
          </p>
        )}
      </div>

      <div className="mt-1.5 flex gap-[3px]">
        {buckets.map((b, i) => (
          <span
            key={b.start}
            className="num flex-1 text-center text-[9px] font-semibold text-mute"
          >
            {buckets.length <= 12 || i % labelEvery === 0 ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
