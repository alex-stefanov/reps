import { describe, expect, it } from "vitest";
import { planAutofill } from "@/lib/core/autofill";

const idea = (id: string, hours: number | null) => ({ id, hours });

describe("planAutofill", () => {
  it("sizes each idea's run to its hours at the weekly project capacity", () => {
    const plan = planAutofill({
      ideas: [idea("a", 10), idea("b", 4), idea("c", 20)],
      projectHoursPerWeek: 5,
      startWeekIndex: 0,
      totalWeeks: 12,
    });
    expect(plan).toEqual([
      { ideaId: "a", startWeekIndex: 0, weekCount: 2 }, // 10/5 = 2
      { ideaId: "b", startWeekIndex: 2, weekCount: 1 }, // 4/5 → 1
      { ideaId: "c", startWeekIndex: 3, weekCount: 4 }, // 20/5 = 4
    ]);
  });

  it("packs contiguously from the start week forward", () => {
    const plan = planAutofill({
      ideas: [idea("a", 6), idea("b", 6)],
      projectHoursPerWeek: 6,
      startWeekIndex: 3,
      totalWeeks: 12,
    });
    expect(plan).toEqual([
      { ideaId: "a", startWeekIndex: 3, weekCount: 1 },
      { ideaId: "b", startWeekIndex: 4, weekCount: 1 },
    ]);
  });

  it("gives unestimated ideas a default run and never zero weeks", () => {
    const plan = planAutofill({
      ideas: [idea("a", null), idea("b", 1)],
      projectHoursPerWeek: 5,
      startWeekIndex: 0,
      totalWeeks: 12,
    });
    expect(plan[0]).toEqual({ ideaId: "a", startWeekIndex: 0, weekCount: 2 });
    expect(plan[1]).toEqual({ ideaId: "b", startWeekIndex: 2, weekCount: 1 });
  });

  it("stops when the program runs out of weeks and clamps the last run", () => {
    const plan = planAutofill({
      ideas: [idea("a", 100), idea("b", 100)],
      projectHoursPerWeek: 5,
      startWeekIndex: 10,
      totalWeeks: 12,
    });
    // Only two weeks remain; the first idea takes both, the second is dropped.
    expect(plan).toEqual([
      { ideaId: "a", startWeekIndex: 10, weekCount: 2 },
    ]);
  });

  it("caps a single idea's run so the pool spreads across the horizon", () => {
    const plan = planAutofill({
      // One huge idea would otherwise eat all 12 weeks at 2h/week.
      ideas: [idea("big", 60), idea("b", 4), idea("c", 4)],
      projectHoursPerWeek: 2,
      startWeekIndex: 0,
      totalWeeks: 12,
      maxRunWeeks: 4,
    });
    expect(plan).toEqual([
      { ideaId: "big", startWeekIndex: 0, weekCount: 4 }, // capped from 30
      { ideaId: "b", startWeekIndex: 4, weekCount: 2 },
      { ideaId: "c", startWeekIndex: 6, weekCount: 2 },
    ]);
  });

  it("survives a zero/absent weekly capacity without dividing by zero", () => {
    const plan = planAutofill({
      ideas: [idea("a", 3)],
      projectHoursPerWeek: 0,
      startWeekIndex: 0,
      totalWeeks: 12,
    });
    expect(plan[0].weekCount).toBe(3); // treated as 1h/week
  });
});
