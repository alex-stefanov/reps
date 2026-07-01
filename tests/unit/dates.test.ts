import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  diffDaysISO,
  isoWeekday,
  localDateISO,
  weekdayName,
} from "@/lib/core/dates";

describe("localDateISO", () => {
  it("resolves the calendar day in the user's timezone, not the server's", () => {
    const instant = new Date("2026-07-01T23:30:00Z");
    expect(localDateISO(instant, "UTC")).toBe("2026-07-01");
    expect(localDateISO(instant, "Europe/Berlin")).toBe("2026-07-02");
    expect(localDateISO(instant, "America/Los_Angeles")).toBe("2026-07-01");
  });

  it("handles the midnight boundary exactly (spec open Q7)", () => {
    // 00:00 in Berlin is still "yesterday" in UTC.
    const midnightBerlin = new Date("2026-06-30T22:00:00Z");
    expect(localDateISO(midnightBerlin, "Europe/Berlin")).toBe("2026-07-01");
    expect(localDateISO(midnightBerlin, "UTC")).toBe("2026-06-30");
  });
});

describe("addDaysISO / diffDaysISO", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffs whole days", () => {
    expect(diffDaysISO("2026-07-01", "2026-07-04")).toBe(3);
    expect(diffDaysISO("2026-07-04", "2026-07-01")).toBe(-3);
  });
});

describe("isoWeekday", () => {
  it("indexes Monday as 0", () => {
    expect(isoWeekday("2026-07-06")).toBe(0); // a Monday
    expect(weekdayName("2026-07-05")).toBe("Sun");
  });
});
