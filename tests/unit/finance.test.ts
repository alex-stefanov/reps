import { describe, expect, it } from "vitest";
import {
  bucketSeries,
  customPeriod,
  entriesInPeriod,
  formatEuros,
  parseEuros,
  periodBuckets,
  periodFor,
  sankeyFlows,
  totals,
  type EntryLike,
} from "@/lib/core/finance";

const entry = (
  direction: "income" | "spending",
  amountCents: number,
  categoryId: string,
  occurredOn: string,
): EntryLike => ({ direction, amountCents, categoryId, occurredOn });

describe("periodFor", () => {
  it("week runs Monday through Sunday around the anchor", () => {
    // 2026-07-06 is a Monday.
    expect(periodFor("week", "2026-07-06")).toMatchObject({
      start: "2026-07-06",
      end: "2026-07-12",
      label: "This week",
    });
    expect(periodFor("week", "2026-07-09")).toMatchObject({
      start: "2026-07-06",
      end: "2026-07-12",
    });
    expect(periodFor("week", "2026-07-12")).toMatchObject({
      start: "2026-07-06",
      end: "2026-07-12",
    });
  });

  it("chevrons step whole periods back", () => {
    expect(periodFor("week", "2026-07-06", -1)).toMatchObject({
      start: "2026-06-29",
      end: "2026-07-05",
      label: "Last week",
    });
    expect(periodFor("month", "2026-07-06", -1)).toMatchObject({
      start: "2026-06-01",
      end: "2026-06-30",
      label: "Jun 2026",
    });
    expect(periodFor("year", "2026-07-06", -1)).toMatchObject({
      start: "2025-01-01",
      end: "2025-12-31",
      label: "2025",
    });
  });

  it("month handles year boundaries and leap February", () => {
    expect(periodFor("month", "2026-01-15", -1)).toMatchObject({
      start: "2025-12-01",
      end: "2025-12-31",
    });
    expect(periodFor("month", "2028-02-10")).toMatchObject({
      start: "2028-02-01",
      end: "2028-02-29",
    });
  });

  it("custom tolerates reversed bounds", () => {
    expect(customPeriod("2026-07-10", "2026-07-01")).toMatchObject({
      start: "2026-07-01",
      end: "2026-07-10",
    });
  });
});

describe("entriesInPeriod + totals", () => {
  const entries = [
    entry("income", 250_000, "salary", "2026-07-01"),
    entry("spending", 4_500, "food", "2026-07-03"),
    entry("spending", 90_000, "housing", "2026-06-30"), // outside July
  ];

  it("filters by inclusive date bounds and sums per direction", () => {
    const july = periodFor("month", "2026-07-06");
    const inJuly = entriesInPeriod(entries, july);
    expect(inJuly).toHaveLength(2);
    expect(totals(inJuly)).toEqual({
      incomeCents: 250_000,
      spendingCents: 4_500,
      netCents: 245_500,
    });
  });
});

describe("periodBuckets + bucketSeries", () => {
  it("week has 7 weekday buckets, M first", () => {
    const buckets = periodBuckets(periodFor("week", "2026-07-06"));
    expect(buckets).toHaveLength(7);
    expect(buckets.map((b) => b.label).join("")).toBe("MTWTFSS");
  });

  it("month has one bucket per day", () => {
    const buckets = periodBuckets(periodFor("month", "2026-02-10"));
    expect(buckets).toHaveLength(28);
    expect(buckets[0].label).toBe("1");
  });

  it("year has 12 month buckets that cover whole months", () => {
    const buckets = periodBuckets(periodFor("year", "2026-07-06"));
    expect(buckets).toHaveLength(12);
    expect(buckets[1]).toMatchObject({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("long custom periods coarsen to weekly buckets", () => {
    const buckets = periodBuckets(customPeriod("2026-01-01", "2026-03-01"));
    expect(buckets.length).toBeGreaterThan(4);
    expect(buckets.length).toBeLessThan(15);
    // Buckets tile the span without gaps.
    expect(buckets[0].start).toBe("2026-01-01");
    expect(buckets.at(-1)!.end).toBe("2026-03-01");
  });

  it("sums amounts into the right buckets for one direction", () => {
    const week = periodFor("week", "2026-07-06");
    const series = bucketSeries(
      [
        entry("spending", 1_000, "food", "2026-07-06"), // Monday
        entry("spending", 2_000, "food", "2026-07-08"), // Wednesday
        entry("spending", 500, "food", "2026-07-08"),
        entry("income", 9_999, "salary", "2026-07-08"), // other direction
      ],
      periodBuckets(week),
      "spending",
    );
    expect(series).toEqual([1_000, 0, 2_500, 0, 0, 0, 0]);
  });
});

describe("sankeyFlows", () => {
  it("splits gross into spending categories plus net remainder", () => {
    const flows = sankeyFlows([
      entry("income", 200_000, "salary", "2026-07-01"),
      entry("income", 30_000, "freelance", "2026-07-02"),
      entry("spending", 60_000, "housing", "2026-07-03"),
      entry("spending", 25_000, "food", "2026-07-04"),
      entry("spending", 5_000, "food", "2026-07-05"),
    ]);
    expect(flows.grossCents).toBe(230_000);
    expect(flows.spendingCents).toBe(90_000);
    expect(flows.netCents).toBe(140_000);
    expect(flows.deficitCents).toBe(0);
    // Largest flows first.
    expect(flows.sources.map((s) => s.categoryId)).toEqual([
      "salary",
      "freelance",
    ]);
    expect(flows.destinations).toEqual([
      { categoryId: "housing", cents: 60_000 },
      { categoryId: "food", cents: 30_000 },
    ]);
  });

  it("reports a deficit honestly instead of a negative net", () => {
    const flows = sankeyFlows([
      entry("income", 10_000, "salary", "2026-07-01"),
      entry("spending", 15_000, "housing", "2026-07-02"),
    ]);
    expect(flows.netCents).toBe(0);
    expect(flows.deficitCents).toBe(5_000);
  });
});

describe("euro formatting and parsing", () => {
  it("formats cents, dropping .00 on whole euros", () => {
    expect(formatEuros(123_456)).toBe("€1,234.56");
    expect(formatEuros(500_00)).toBe("€500");
    expect(formatEuros(-2_50)).toBe("−€2.50");
    expect(formatEuros(2_50, { sign: true })).toBe("+€2.50");
  });

  it("parses typed amounts, comma or dot, rejecting garbage", () => {
    expect(parseEuros("12")).toBe(1_200);
    expect(parseEuros("12.5")).toBe(1_250);
    expect(parseEuros("12,50")).toBe(1_250);
    expect(parseEuros(" €9.99 ")).toBe(999);
    expect(parseEuros("0")).toBeNull();
    expect(parseEuros("-5")).toBeNull();
    expect(parseEuros("abc")).toBeNull();
    expect(parseEuros("1.2.3")).toBeNull();
    expect(parseEuros("12.345")).toBeNull();
  });
});
