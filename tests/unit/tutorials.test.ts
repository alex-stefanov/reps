import { describe, expect, it } from "vitest";
import {
  CURATED_TUTORIALS,
  distinctTags,
  hostLabel,
  parseTutorialInput,
} from "@/lib/core/tutorials";

describe("parseTutorialInput", () => {
  const base = {
    title: "Full Stack Open",
    url: "https://fullstackopen.com/en/",
    language: "TypeScript",
    topic: "Web",
  };

  it("accepts a clean entry and normalizes whitespace", () => {
    expect(
      parseTutorialInput({ ...base, title: "  Full   Stack Open " }),
    ).toEqual(base);
  });

  it("rejects bad urls and non-http protocols", () => {
    expect(parseTutorialInput({ ...base, url: "not a url" })).toBeNull();
    expect(parseTutorialInput({ ...base, url: "ftp://x.dev" })).toBeNull();
    expect(
      parseTutorialInput({ ...base, url: "javascript:alert(1)" }),
    ).toBeNull();
  });

  it("requires title, language, and topic", () => {
    expect(parseTutorialInput({ ...base, title: "x" })).toBeNull();
    expect(parseTutorialInput({ ...base, language: " " })).toBeNull();
    expect(parseTutorialInput({ ...base, topic: "" })).toBeNull();
  });
});

describe("hostLabel", () => {
  it("shows the bare host as provenance", () => {
    expect(hostLabel("https://www.youtube.com/watch?v=x")).toBe("youtube.com");
    expect(hostLabel("https://github.com/a/b")).toBe("github.com");
    expect(hostLabel("garbage")).toBe("");
  });
});

describe("distinctTags", () => {
  it("collects sorted unique languages and topics", () => {
    const tags = distinctTags([
      { language: "Go", topic: "Systems" },
      { language: "C#", topic: "Web" },
      { language: "Go", topic: "Web" },
    ]);
    expect(tags.languages).toEqual(["C#", "Go"]);
    expect(tags.topics).toEqual(["Systems", "Web"]);
  });
});

describe("CURATED_TUTORIALS", () => {
  it("every seed passes the same validation as user input", () => {
    for (const t of CURATED_TUTORIALS) {
      expect(parseTutorialInput(t)).toEqual(t);
      expect(t.url.startsWith("https://")).toBe(true);
    }
  });

  it("covers the sketch's cards: ASP, C#, and AI", () => {
    const text = CURATED_TUTORIALS.map((t) => `${t.title} ${t.topic}`).join(" ");
    expect(text).toMatch(/ASP\.NET/);
    expect(text).toMatch(/C#/);
    expect(text).toMatch(/AI/);
  });
});
