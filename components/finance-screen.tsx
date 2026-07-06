"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { addDaysISO } from "@/lib/core/dates";
import {
  customPeriod,
  entriesInPeriod,
  periodFor,
  sankeyFlows,
  totals,
  type EntryLike,
  type Period,
  type PeriodKind,
} from "@/lib/core/finance";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { BreakdownChart, TotalsChart } from "./finance-charts";
import { FinanceEntryList } from "./finance-entries";
import { FinanceSankey } from "./finance-sankey";

/** Slim wire shapes — the page passes only what the charts need. */
export interface CategoryDTO {
  id: string;
  name: string;
  kind: "income" | "spending";
  isDefault: boolean;
}

export interface EntryDTO extends EntryLike {
  id: string;
}

/** Deterministic category tint: iOS palette, assigned by first appearance. */
const CATEGORY_PALETTE = [
  "#ff9f0a",
  "#0a84ff",
  "#ff375f",
  "#30b0c7",
  "#bf5af2",
  "#ffd60a",
  "#ac8e68",
  "#64d2ff",
];

export function categoryColors(categories: CategoryDTO[]): Map<string, string> {
  // Cycle the palette per kind: Sankey sides and chart legends only ever
  // show one kind together, so collisions need 9+ categories of one kind.
  const map = new Map<string, string>();
  // Income starts half a palette away so the two kinds rarely echo each other.
  const counters = { income: CATEGORY_PALETTE.length / 2, spending: 0 };
  for (const c of categories) {
    map.set(c.id, CATEGORY_PALETTE[counters[c.kind]++ % CATEGORY_PALETTE.length]);
  }
  return map;
}

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "week", label: "Week" },
  { kind: "month", label: "Month" },
  { kind: "year", label: "Year" },
  { kind: "custom", label: "Custom" },
];

export function FinanceScreen({
  today,
  categories,
  entries,
}: {
  today: string;
  categories: CategoryDTO[];
  entries: EntryDTO[];
}) {
  const [kind, setKind] = useState<PeriodKind>("week");
  /** 0 = current period; chevrons walk into the past. */
  const [offset, setOffset] = useState(0);
  const [customStart, setCustomStart] = useState(addDaysISO(today, -30));
  const [customEnd, setCustomEnd] = useState(today);

  const period: Period = useMemo(
    () =>
      kind === "custom"
        ? customPeriod(customStart, customEnd)
        : periodFor(kind, today, offset),
    [kind, offset, customStart, customEnd, today],
  );

  const inPeriod = useMemo(
    () => entriesInPeriod(entries, period),
    [entries, period],
  );
  const sums = useMemo(() => totals(inPeriod), [inPeriod]);
  const flows = useMemo(() => sankeyFlows(inPeriod), [inPeriod]);
  const colors = useMemo(() => categoryColors(categories), [categories]);
  const names = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const pickKind = (next: PeriodKind) => {
    setKind(next);
    setOffset(0);
  };

  return (
    <div className="mt-6">
      {/* Period carousel (spec §7.1) */}
      <div
        role="tablist"
        aria-label="Period"
        className="card-shadow flex rounded-2xl bg-card p-1"
      >
        {KINDS.map(({ kind: k, label }) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            data-testid={`period-${k}`}
            onClick={() => pickKind(k)}
            className={`relative flex-1 rounded-xl py-2 text-[13px] font-bold transition-colors ${
              kind === k ? "text-text" : "text-sub hover:text-text"
            }`}
          >
            {kind === k && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-xl bg-inset ring-1 ring-hair"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Window readout: chevrons for the fixed kinds, date bounds for custom */}
      {kind === "custom" ? (
        <div className="mt-3 flex items-center justify-center gap-2 px-1">
          <input
            type="date"
            value={customStart}
            max={today}
            aria-label="From"
            onChange={(e) => e.target.value && setCustomStart(e.target.value)}
            className="num card-shadow rounded-xl bg-card px-3 py-2 text-[13px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-xs font-bold text-mute">→</span>
          <input
            type="date"
            value={customEnd}
            max={today}
            aria-label="To"
            onChange={(e) => e.target.value && setCustomEnd(e.target.value)}
            className="num card-shadow rounded-xl bg-card px-3 py-2 text-[13px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            aria-label="Previous period"
            onClick={() => setOffset((o) => o - 1)}
            className="card-shadow flex size-8 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={period.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              data-testid="period-label"
              className="text-sm font-extrabold tracking-tight text-text"
            >
              {period.label}
            </motion.p>
          </AnimatePresence>
          <button
            aria-label="Next period"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            className="card-shadow flex size-8 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95 disabled:opacity-35"
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      )}

      {/* Totals: S vs I (spec §7.1) */}
      <section className="mt-4">
        <TotalsChart totals={sums} />
      </section>

      {/* Per-day breakdown with Income/Spending sub-toggle */}
      <section className="mt-4">
        <BreakdownChart entries={inPeriod} period={period} />
      </section>

      {/* Sankey: income → net → categories (spec §7.3) */}
      <section className="mt-4">
        <FinanceSankey flows={flows} names={names} colors={colors} />
      </section>

      {/* The period's raw entries — the undo surface */}
      <section className="mt-4">
        <FinanceEntryList entries={inPeriod} names={names} colors={colors} />
      </section>
    </div>
  );
}
