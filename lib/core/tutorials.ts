/**
 * Tutorials domain (spec §11): input validation and the curated seed
 * library. Pure — the UI and server both speak this.
 */

export interface TutorialInput {
  title: string;
  url: string;
  language: string;
  topic: string;
}

function cleanTag(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

/** Normalizes and validates Add/Edit Tutorial fields; null when unusable. */
export function parseTutorialInput(raw: {
  title: unknown;
  url: unknown;
  language: unknown;
  topic: unknown;
}): TutorialInput | null {
  const title = cleanTag(raw.title, 80);
  if (title.length < 2) return null;

  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
  } catch {
    return null;
  }

  const language = cleanTag(raw.language, 24);
  const topic = cleanTag(raw.topic, 24);
  if (!language || !topic) return null;

  return { title, url, language, topic };
}

/** "youtube.com" from a URL — the card's provenance line. */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Distinct filter chips in first-seen order (spec §11.1: Language / Topic). */
export function distinctTags(
  tutorials: { language: string; topic: string }[],
): { languages: string[]; topics: string[] } {
  const languages: string[] = [];
  const topics: string[] = [];
  for (const t of tutorials) {
    if (!languages.includes(t.language)) languages.push(t.language);
    if (!topics.includes(t.topic)) topics.push(t.topic);
  }
  return { languages: languages.sort(), topics: topics.sort() };
}

/**
 * The seed library (spec §11.2): the resources already gathered —
 * Project-Based-Learning, Build-Your-Own-X, the from-scratch courses —
 * plus the sketch's ASP / C# / AI cards. Seeded once; fully curable after.
 */
export const CURATED_TUTORIALS: TutorialInput[] = [
  {
    title: "Build Your Own X",
    url: "https://github.com/codecrafters-io/build-your-own-x",
    language: "Any",
    topic: "Systems",
  },
  {
    title: "Project-Based Learning",
    url: "https://github.com/practical-tutorials/project-based-learning",
    language: "Any",
    topic: "Projects",
  },
  {
    title: "CS50: Introduction to Computer Science",
    url: "https://cs50.harvard.edu/x/",
    language: "C",
    topic: "Fundamentals",
  },
  {
    title: "C# for Beginners",
    url: "https://learn.microsoft.com/dotnet/csharp/tour-of-csharp/",
    language: "C#",
    topic: "Fundamentals",
  },
  {
    title: "ASP.NET Core Fundamentals",
    url: "https://learn.microsoft.com/aspnet/core/fundamentals/",
    language: "C#",
    topic: "Web",
  },
  {
    title: "Full Stack Open",
    url: "https://fullstackopen.com/en/",
    language: "TypeScript",
    topic: "Web",
  },
  {
    title: "Neural Networks: Zero to Hero",
    url: "https://karpathy.ai/zero-to-hero.html",
    language: "Python",
    topic: "AI",
  },
  {
    title: "Writing an Interpreter in Go",
    url: "https://interpreterbook.com/",
    language: "Go",
    topic: "Systems",
  },
  {
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    language: "Rust",
    topic: "Fundamentals",
  },
  {
    title: "SQLBolt — Learn SQL",
    url: "https://sqlbolt.com/",
    language: "SQL",
    topic: "Databases",
  },
];
