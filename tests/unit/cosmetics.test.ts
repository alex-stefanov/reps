import { describe, expect, it } from "vitest";
import {
  AMBIANCES,
  ambianceById,
  DEFAULT_AMBIANCE_ID,
  parseCosmetics,
} from "@/lib/core/cosmetics";

describe("parseCosmetics", () => {
  it("reads a valid stored config", () => {
    expect(parseCosmetics({ ambiance: "neon" })).toEqual({ ambiance: "neon" });
  });

  it("falls back to the default for junk, unknown ids, and legacy shapes", () => {
    expect(parseCosmetics(null)).toEqual({ ambiance: DEFAULT_AMBIANCE_ID });
    expect(parseCosmetics({})).toEqual({ ambiance: DEFAULT_AMBIANCE_ID });
    expect(parseCosmetics({ ambiance: "vaporwave" })).toEqual({
      ambiance: DEFAULT_AMBIANCE_ID,
    });
    expect(parseCosmetics("noir")).toEqual({ ambiance: DEFAULT_AMBIANCE_ID });
    // Future fields pass through parsing without breaking today's read.
    expect(parseCosmetics({ ambiance: "noir", pack: "winter" })).toEqual({
      ambiance: "noir",
    });
  });
});

describe("AMBIANCES", () => {
  it("ids are unique and the default exists", () => {
    const ids = AMBIANCES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_AMBIANCE_ID);
  });

  it("ambianceById resolves and falls back safely", () => {
    expect(ambianceById("noir").name).toBe("Noir");
    expect(ambianceById("nope").id).toBe(DEFAULT_AMBIANCE_ID);
  });

  it("the reference look leaves the portrait untouched", () => {
    const studio = ambianceById("studio");
    expect(studio.washOpacity).toBe(0);
  });
});
