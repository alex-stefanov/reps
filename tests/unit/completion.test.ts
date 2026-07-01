import { describe, expect, it } from "vitest";
import { computeStreak, contributionLevel } from "@/lib/core/completion";

describe("contributionLevel", () => {
  it("maps done/total to GitHub-style levels 0–4", () => {
    expect(contributionLevel(0, 3)).toBe(0);
    expect(contributionLevel(0, 0)).toBe(0);
    expect(contributionLevel(1, 4)).toBe(1);
    expect(contributionLevel(2, 4)).toBe(2);
    expect(contributionLevel(3, 4)).toBe(3);
    expect(contributionLevel(4, 4)).toBe(4);
    expect(contributionLevel(1, 3)).toBe(2);
    expect(contributionLevel(3, 3)).toBe(4);
  });
});

describe("computeStreak", () => {
  const day = (date: string, done: number, total: number) => ({
    date,
    tasksDone: done,
    tasksTotal: total,
  });

  it("counts consecutive complete days ending today", () => {
    const streak = computeStreak(
      [
        day("2026-06-29", 3, 3),
        day("2026-06-30", 2, 2),
        day("2026-07-01", 3, 3),
      ],
      "2026-07-01",
    );
    expect(streak).toEqual({ current: 3, justLost: false });
  });

  it("does not break the streak while today is still in progress", () => {
    const streak = computeStreak(
      [day("2026-06-30", 2, 2), day("2026-07-01", 1, 3)],
      "2026-07-01",
    );
    expect(streak.current).toBe(1);
    expect(streak.justLost).toBe(false);
  });

  it("rest days pass through without counting or breaking", () => {
    const streak = computeStreak(
      [
        day("2026-06-28", 2, 2),
        day("2026-06-29", 0, 0), // rest
        day("2026-06-30", 3, 3),
      ],
      "2026-07-01",
    );
    expect(streak.current).toBe(2);
  });

  it("flags a just-lost streak when yesterday broke it", () => {
    const streak = computeStreak(
      [
        day("2026-06-28", 2, 2),
        day("2026-06-29", 3, 3),
        day("2026-06-30", 1, 3), // broke it
      ],
      "2026-07-01",
    );
    expect(streak).toEqual({ current: 0, justLost: true });
  });

  it("no false loss signal when there was never a streak", () => {
    const streak = computeStreak([day("2026-06-30", 0, 3)], "2026-07-01");
    expect(streak).toEqual({ current: 0, justLost: false });
  });
});
