import { describe, expect, it } from "vitest";
import { dayTotalHours, generateSchedule } from "@/lib/core/schedule";

const weekOf = (days: ReturnType<typeof generateSchedule>, week: number) =>
  days.filter((d) => d.weekIndex === week);

const trackCount = (
  days: ReturnType<typeof generateSchedule>,
  track: string,
) => days.flatMap((d) => d.tasks).filter((t) => t.track === track).length;

describe("generateSchedule", () => {
  // The acceptance case from spec §8.4: "10h/week, medium intensity".
  const tenSteady = generateSchedule({
    hoursPerWeek: 10,
    intensity: "steady",
    startDate: "2026-07-06",
    weeks: 4,
  });

  it("generates every day of every requested week, dated from startDate", () => {
    expect(tenSteady).toHaveLength(28);
    expect(tenSteady[0].date).toBe("2026-07-06");
    expect(tenSteady[27].date).toBe("2026-08-02");
    expect(new Set(tenSteady.map((d) => d.date)).size).toBe(28);
  });

  it("follows the agreed cadence: BYOX 3×/wk (steady), LinkedIn 3×/wk, LeetCode every other day", () => {
    for (let w = 0; w < 4; w++) {
      const week = weekOf(tenSteady, w);
      expect(trackCount(week, "byox")).toBe(3);
      expect(trackCount(week, "linkedin")).toBe(3);
      expect(trackCount(week, "project")).toBe(2);
    }
    // Every other day, continuous across week boundaries: 14 over 4 weeks.
    expect(trackCount(tenSteady, "leetcode")).toBe(14);
    const leetDates = tenSteady
      .filter((d) => d.tasks.some((t) => t.track === "leetcode"))
      .map((d) => d.date);
    expect(leetDates[0]).toBe("2026-07-06");
    expect(leetDates[1]).toBe("2026-07-08");
  });

  it("keeps weekly totals within the chosen band", () => {
    for (let w = 0; w < 4; w++) {
      const total = weekOf(tenSteady, w)
        .flatMap((d) => d.tasks)
        .reduce((s, t) => s + t.hours, 0);
      expect(total).toBeGreaterThanOrEqual(9);
      expect(total).toBeLessThanOrEqual(12);
    }
  });

  it("emits hours in 0.5 steps, never below the session floor", () => {
    for (const task of tenSteady.flatMap((d) => d.tasks)) {
      expect(task.hours * 2).toBe(Math.round(task.hours * 2));
      expect(task.hours).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("respects intensity: chill drops to BYOX 2×/wk", () => {
    const chill = generateSchedule({
      hoursPerWeek: 6,
      intensity: "chill",
      startDate: "2026-07-06",
      weeks: 2,
    });
    expect(trackCount(weekOf(chill, 0), "byox")).toBe(2);
    expect(trackCount(weekOf(chill, 0), "project")).toBe(1);
  });

  it("generates no LeetCode tasks when the track is toggled off", () => {
    const noLeet = generateSchedule({
      hoursPerWeek: 10,
      intensity: "steady",
      startDate: "2026-07-06",
      weeks: 2,
      leetcodeOn: false,
    });
    expect(trackCount(noLeet, "leetcode")).toBe(0);
    // Hours redistribute to the remaining tracks rather than vanishing.
    const weekTotal = weekOf(noLeet, 0)
      .flatMap((d) => d.tasks)
      .reduce((s, t) => s + t.hours, 0);
    expect(weekTotal).toBeGreaterThanOrEqual(9);
  });

  it("is deterministic", () => {
    const again = generateSchedule({
      hoursPerWeek: 10,
      intensity: "steady",
      startDate: "2026-07-06",
      weeks: 4,
    });
    expect(again).toEqual(tenSteady);
  });

  it("marks empty days as Rest", () => {
    const noLeet = generateSchedule({
      hoursPerWeek: 10,
      intensity: "steady",
      startDate: "2026-07-06",
      weeks: 1,
      leetcodeOn: false,
    });
    const rest = noLeet.filter((d) => d.tasks.length === 0);
    expect(rest.every((d) => d.note === "Rest")).toBe(true);
  });
});

describe("dayTotalHours", () => {
  it("sums task hours (the Th column)", () => {
    expect(dayTotalHours([{ hours: 1.5 }, { hours: 0.5 }])).toBe(2);
  });
});
