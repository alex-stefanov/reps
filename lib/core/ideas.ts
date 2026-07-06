/**
 * Ideas Pool domain (spec §9): types, input validation, and the curated seed
 * list. Pure data + functions — the UI and server both speak this.
 */

export const IDEA_TYPES = ["byox", "saas", "project"] as const;
export type IdeaType = (typeof IDEA_TYPES)[number];

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  byox: "BYOX",
  saas: "SaaS",
  project: "Project",
};

export function parseIdeaType(value: unknown): IdeaType | null {
  return IDEA_TYPES.includes(value as IdeaType) ? (value as IdeaType) : null;
}

export interface IdeaInput {
  name: string;
  type: IdeaType;
  description: string | null;
  hours: number | null;
}

/** Normalizes and validates Add/Edit Idea fields; null when unusable. */
export function parseIdeaInput(raw: {
  name: unknown;
  type: unknown;
  description: unknown;
  hours: unknown;
}): IdeaInput | null {
  const type = parseIdeaType(raw.type);
  if (!type) return null;

  const name =
    typeof raw.name === "string"
      ? raw.name.trim().replace(/\s+/g, " ").slice(0, 60)
      : "";
  if (name.length < 2) return null;

  const description =
    typeof raw.description === "string" && raw.description.trim() !== ""
      ? raw.description.trim().slice(0, 280)
      : null;

  const hoursNum = Number(raw.hours);
  const hours =
    raw.hours !== null && raw.hours !== "" && Number.isFinite(hoursNum)
      ? Math.min(500, Math.max(1, Math.round(hoursNum)))
      : null;

  return { name, type, description, hours };
}

/**
 * The curated starter pool (spec §9.6: "seed the pool from the curated
 * lists"). Held to the §9.3 bar: real, buildable, meaningful projects —
 * never filler. Seeded once per user; fully deletable after that.
 */
export const CURATED_IDEAS: IdeaInput[] = [
  {
    name: "Build your own Redis",
    type: "byox",
    description:
      "In-memory KV store speaking RESP: strings, TTLs, pub/sub — then AOF persistence so restarts stop hurting.",
    hours: 25,
  },
  {
    name: "Build your own Git",
    type: "byox",
    description:
      "Content-addressed object store, an index, then commit/branch/merge plumbing. You'll never fear a rebase again.",
    hours: 30,
  },
  {
    name: "Build your own HTTP server",
    type: "byox",
    description:
      "Raw TCP sockets to HTTP/1.1: parsing, routing, keep-alive, static files, and a tiny middleware layer on top.",
    hours: 18,
  },
  {
    name: "Text-to-SQL IDE",
    type: "project",
    description:
      "Schema-aware editor that turns questions into SQL, with explain-before-run safety and query history.",
    hours: 40,
  },
  {
    name: "Vector database",
    type: "project",
    description:
      "HNSW index from the paper, cosine/dot metrics, a small query API, and a benchmark harness to prove it.",
    hours: 35,
  },
  {
    name: "CRDT collaborative editor",
    type: "project",
    description:
      "Realtime markdown co-editing without a central lock — a Yjs-style CRDT built from first principles.",
    hours: 30,
  },
  {
    name: "Uptime monitor",
    type: "saas",
    description:
      "Scheduled probes, incident timelines, and public status pages. The classic first SaaS, done properly.",
    hours: 40,
  },
  {
    name: "Changelog as a service",
    type: "saas",
    description:
      "Embeddable release-notes widget plus an API, for indie devs who ship faster than they document.",
    hours: 25,
  },
  {
    name: "Screenshot-to-API service",
    type: "saas",
    description:
      "URL in, rendered screenshot out: a job queue, a headless browser pool, and usage metering for billing later.",
    hours: 30,
  },
];
