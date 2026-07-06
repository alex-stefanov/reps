import { describe, expect, it } from "vitest";
import {
  CURATED_IDEAS,
  IDEA_TYPES,
  parseIdeaInput,
  parseIdeaType,
} from "@/lib/core/ideas";

describe("parseIdeaType", () => {
  it("accepts the three pool types and nothing else", () => {
    expect(parseIdeaType("byox")).toBe("byox");
    expect(parseIdeaType("saas")).toBe("saas");
    expect(parseIdeaType("project")).toBe("project");
    expect(parseIdeaType("BYOX")).toBeNull();
    expect(parseIdeaType("")).toBeNull();
    expect(parseIdeaType(undefined)).toBeNull();
  });
});

describe("parseIdeaInput", () => {
  const base = {
    name: "Text-to-SQL IDE",
    type: "project",
    description: "  Schema-aware editor.  ",
    hours: "40",
  };

  it("normalizes whitespace, trims, and clamps", () => {
    const parsed = parseIdeaInput({ ...base, name: "  Text-to-SQL   IDE  " });
    expect(parsed).toEqual({
      name: "Text-to-SQL IDE",
      type: "project",
      description: "Schema-aware editor.",
      hours: 40,
    });
  });

  it("rejects missing type or too-short names", () => {
    expect(parseIdeaInput({ ...base, type: "app" })).toBeNull();
    expect(parseIdeaInput({ ...base, name: "x" })).toBeNull();
  });

  it("empty description and hours become null, hours clamp to 1–500", () => {
    expect(
      parseIdeaInput({ ...base, description: "  ", hours: "" }),
    ).toMatchObject({ description: null, hours: null });
    expect(parseIdeaInput({ ...base, hours: "0" })).toMatchObject({ hours: 1 });
    expect(parseIdeaInput({ ...base, hours: "9999" })).toMatchObject({
      hours: 500,
    });
    expect(parseIdeaInput({ ...base, hours: "abc" })).toMatchObject({
      hours: null,
    });
  });
});

describe("CURATED_IDEAS", () => {
  it("every seed is a valid, complete idea covering all three types", () => {
    for (const idea of CURATED_IDEAS) {
      // The seeds must pass the same bar as user input (spec §9.3).
      expect(parseIdeaInput(idea)).toEqual(idea);
      expect(idea.description).toBeTruthy();
      expect(idea.hours).toBeGreaterThan(0);
    }
    for (const type of IDEA_TYPES) {
      expect(CURATED_IDEAS.filter((i) => i.type === type).length).toBeGreaterThanOrEqual(3);
    }
  });
});
