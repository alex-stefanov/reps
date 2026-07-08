import { addDaysISO, diffDaysISO, isoWeekday } from "./dates";

/**
 * Finance math (spec §7): period windows, per-bucket aggregation, and the
 * Sankey flow model. Pure functions over integer cents — no framework, no DB,
 * no floats. The UI (and a future native client) renders what this computes.
 */

export type FinanceDirection = "income" | "spending";
export type PeriodKind = "week" | "month" | "year" | "custom";

export interface Period {
  kind: PeriodKind;
  /** Inclusive ISO date bounds. */
  start: string;
  end: string;
  label: string;
}

export interface EntryLike {
  direction: FinanceDirection;
  amountCents: number;
  categoryId: string;
  occurredOn: string;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthName(iso: string): string {
  return MONTH_SHORT[Number(iso.slice(5, 7)) - 1];
}

function humanDate(iso: string): string {
  return `${monthName(iso)} ${Number(iso.slice(8, 10))}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The period window containing `anchor` (an ISO date, normally today in the
 * user's timezone). `offset` steps whole periods back (-1 = last week/month/
 * year); the carousel's chevrons drive it.
 */
export function periodFor(
  kind: Exclude<PeriodKind, "custom">,
  anchor: string,
  offset = 0,
): Period {
  if (kind === "week") {
    const monday = addDaysISO(anchor, -isoWeekday(anchor) + offset * 7);
    const sunday = addDaysISO(monday, 6);
    const label =
      offset === 0
        ? "This week"
        : offset === -1
          ? "Last week"
          : `${humanDate(monday)} – ${humanDate(sunday)}`;
    return { kind, start: monday, end: sunday, label };
  }

  const [y, m] = anchor.split("-").map(Number);

  if (kind === "month") {
    // Whole months arithmetic, immune to day-of-month overflow.
    const total = y * 12 + (m - 1) + offset;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    const mm = String(month).padStart(2, "0");
    const start = `${year}-${mm}-01`;
    const end = `${year}-${mm}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`;
    const label =
      offset === 0 ? "This month" : `${MONTH_SHORT[month - 1]} ${year}`;
    return { kind, start, end, label };
  }

  const year = y + offset;
  return {
    kind: "year",
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: offset === 0 ? "This year" : String(year),
  };
}

/** A user-picked window; tolerates reversed bounds. */
export function customPeriod(a: string, b: string): Period {
  const [start, end] = a <= b ? [a, b] : [b, a];
  return {
    kind: "custom",
    start,
    end,
    label: `${humanDate(start)} – ${humanDate(end)}`,
  };
}

export function entriesInPeriod<T extends EntryLike>(
  entries: T[],
  period: Period,
): T[] {
  return entries.filter(
    (e) => e.occurredOn >= period.start && e.occurredOn <= period.end,
  );
}

export interface Totals {
  incomeCents: number;
  spendingCents: number;
  netCents: number;
}

export function totals(entries: EntryLike[]): Totals {
  let incomeCents = 0;
  let spendingCents = 0;
  for (const e of entries) {
    if (e.direction === "income") incomeCents += e.amountCents;
    else spendingCents += e.amountCents;
  }
  return { incomeCents, spendingCents, netCents: incomeCents - spendingCents };
}

export interface Bucket {
  /** Inclusive ISO bounds of the bucket. */
  start: string;
  end: string;
  /** Axis label — weekday letter, day number, or month letter. */
  label: string;
}

/**
 * The breakdown chart's x-axis (spec §7.1): week → 7 weekday bars, month →
 * one bar per day, year → 12 month bars. Custom adapts to its span: daily up
 * to ~5 weeks, weekly up to ~half a year, monthly beyond.
 */
export function periodBuckets(period: Period): Bucket[] {
  const spanDays = diffDaysISO(period.start, period.end) + 1;

  const daily = (labelOf: (iso: string) => string): Bucket[] =>
    Array.from({ length: spanDays }, (_, i) => {
      const date = addDaysISO(period.start, i);
      return { start: date, end: date, label: labelOf(date) };
    });

  if (period.kind === "week") {
    return daily((iso) => "MTWTFSS"[isoWeekday(iso)]);
  }
  if (period.kind === "month") {
    return daily((iso) => String(Number(iso.slice(8, 10))));
  }
  if (period.kind === "year") {
    const year = Number(period.start.slice(0, 4));
    return Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const last = lastDayOfMonth(year, i + 1);
      return {
        start: `${year}-${mm}-01`,
        end: `${year}-${mm}-${String(last).padStart(2, "0")}`,
        label: MONTH_SHORT[i][0],
      };
    });
  }

  // Custom span.
  if (spanDays <= 35) return daily((iso) => String(Number(iso.slice(8, 10))));
  const weekly = spanDays <= 190;
  const step = weekly ? 7 : 30;
  const buckets: Bucket[] = [];
  for (let i = 0; i < spanDays; i += step) {
    const start = addDaysISO(period.start, i);
    const end =
      addDaysISO(start, step - 1) <= period.end
        ? addDaysISO(start, step - 1)
        : period.end;
    buckets.push({ start, end, label: humanDate(start) });
  }
  return buckets;
}

/** Per-bucket sums for one direction — the breakdown chart's bars. */
export function bucketSeries(
  entries: EntryLike[],
  buckets: Bucket[],
  direction: FinanceDirection,
): number[] {
  const sums = new Array<number>(buckets.length).fill(0);
  for (const e of entries) {
    if (e.direction !== direction) continue;
    const i = buckets.findIndex(
      (b) => e.occurredOn >= b.start && e.occurredOn <= b.end,
    );
    if (i !== -1) sums[i] += e.amountCents;
  }
  return sums;
}

export interface SankeyEnd {
  categoryId: string;
  cents: number;
}

/**
 * The money-flow model (spec §7.3): income categories → gross → spending
 * categories, with the unspent remainder as "Net". When spending exceeds
 * income the model stays honest: net is 0 and `deficitCents` reports the
 * overshoot instead of hiding it.
 */
export interface SankeyFlows {
  sources: SankeyEnd[];
  destinations: SankeyEnd[];
  grossCents: number;
  spendingCents: number;
  netCents: number;
  deficitCents: number;
}

export function sankeyFlows(entries: EntryLike[]): SankeyFlows {
  const sourceMap = new Map<string, number>();
  const destMap = new Map<string, number>();
  for (const e of entries) {
    const map = e.direction === "income" ? sourceMap : destMap;
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amountCents);
  }
  const byCents = (a: SankeyEnd, b: SankeyEnd) => b.cents - a.cents;
  const sources = [...sourceMap]
    .map(([categoryId, cents]) => ({ categoryId, cents }))
    .sort(byCents);
  const destinations = [...destMap]
    .map(([categoryId, cents]) => ({ categoryId, cents }))
    .sort(byCents);

  const grossCents = sources.reduce((s, x) => s + x.cents, 0);
  const spendingCents = destinations.reduce((s, x) => s + x.cents, 0);
  const net = grossCents - spendingCents;

  return {
    sources,
    destinations,
    grossCents,
    spendingCents,
    netCents: Math.max(0, net),
    deficitCents: Math.max(0, -net),
  };
}

/** "€1,234.56" — one formatter everywhere so the readout never disagrees with itself. */
export function formatEuros(cents: number, opts?: { sign?: boolean }): string {
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(cents) / 100);
  if (cents < 0) return `−${formatted}`;
  if (opts?.sign && cents > 0) return `+${formatted}`;
  return formatted;
}

/**
 * Parses a user-typed euro amount into cents, or null. Handles a plain decimal
 * ("12", "12.5"), a decimal comma ("12,50"), and grouped output round-tripped
 * from formatEuros ("1,299.00", "€1,000") by stripping thousands separators.
 */
export function parseEuros(input: string): number | null {
  let cleaned = input.trim().replace(/[\s€]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    // The rightmost separator is the decimal point; the other groups thousands.
    cleaned =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".") // "1.299,00"
        : cleaned.replace(/,/g, ""); // "1,299.00"
  } else if (hasComma) {
    // A lone comma with 1–2 trailing digits is a decimal ("12,50"); otherwise
    // it groups thousands ("1,000", "1,234,567").
    cleaned = /,\d{1,2}$/.test(cleaned)
      ? cleaned.replace(",", ".")
      : cleaned.replace(/,/g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}
