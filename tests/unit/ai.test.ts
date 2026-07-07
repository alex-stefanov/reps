import { describe, expect, it } from "vitest";
import {
  normalizeReceiptScan,
  normalizeReply,
  normalizeSuggestions,
} from "@/lib/core/ai";

describe("normalizeReceiptScan", () => {
  it("accepts a clean extraction", () => {
    expect(
      normalizeReceiptScan({
        amountCents: 1299,
        categoryName: "Food",
        merchant: "Gelateria",
      }),
    ).toEqual({ amountCents: 1299, categoryName: "Food", merchant: "Gelateria" });
  });

  it("rejects garbage, zero, negative, and over-cap amounts", () => {
    expect(normalizeReceiptScan(null)).toBeNull();
    expect(normalizeReceiptScan({ amountCents: 0, categoryName: "Food" })).toBeNull();
    expect(
      normalizeReceiptScan({ amountCents: -5, categoryName: "Food" }),
    ).toBeNull();
    expect(
      normalizeReceiptScan({ amountCents: "abc", categoryName: "Food" }),
    ).toBeNull();
    expect(
      normalizeReceiptScan({ amountCents: 999_999_999, categoryName: "Food" }),
    ).toBeNull();
  });

  it("requires a real category name and tolerates a missing merchant", () => {
    expect(
      normalizeReceiptScan({ amountCents: 500, categoryName: "x" }),
    ).toBeNull();
    expect(
      normalizeReceiptScan({ amountCents: 500, categoryName: "Transport" }),
    ).toMatchObject({ merchant: null });
  });
});

describe("normalizeSuggestions", () => {
  it("keeps valid ideas, drops filler, and de-dupes", () => {
    const out = normalizeSuggestions([
      { name: "Vector database", type: "project", description: "HNSW index", hours: 35 },
      { name: "x", type: "project", description: "too short a name", hours: 5 }, // invalid
      { name: "Bad type", type: "app", description: "nope", hours: 5 }, // invalid type
      { name: "Vector Database", type: "project", description: "dup", hours: 10 }, // dup name
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Vector database");
  });

  it("returns an empty array for non-arrays and caps the count", () => {
    expect(normalizeSuggestions(null)).toEqual([]);
    expect(normalizeSuggestions("nope")).toEqual([]);
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `Buildable idea ${i}`,
      type: "saas",
      description: "A real, buildable SaaS project.",
      hours: 20,
    }));
    expect(normalizeSuggestions(many).length).toBeLessThanOrEqual(6);
  });
});

describe("normalizeReply", () => {
  it("trims and clamps, empty for non-strings", () => {
    expect(normalizeReply("  hi  ")).toBe("hi");
    expect(normalizeReply(42)).toBe("");
    expect(normalizeReply("x".repeat(2000)).length).toBe(1200);
  });
});
