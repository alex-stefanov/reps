import { localDateISO } from "./dates";

/**
 * GitHub commit verification (spec §13) — the credibility mechanic.
 *
 * The Commit task only checks off when a real public commit exists for the
 * user's current calendar day. "For the day" means the push became public on
 * that day in the user's timezone (the Events API records push time; commit
 * author dates aren't in the payload and can predate the push anyway —
 * what we verify is public evidence of work today).
 *
 * There is deliberately no code path that reports `found: true` without a
 * commit in the API payload. Do not add one. (CLAUDE.md: never mock this.)
 */

export interface GitHubEvent {
  type: string;
  created_at: string;
  public?: boolean;
  repo?: { name?: string };
  payload?: { commits?: { sha?: string }[] };
}

export interface CommitCheckResult {
  found: boolean;
  /** "owner/repo@shortsha" of the newest qualifying commit, for display. */
  commitRef: string | null;
}

/** Pure decision: does this event list prove a public commit on `dateISO`? */
export function findCommitForDate(
  events: GitHubEvent[],
  dateISO: string,
  timeZone: string,
): CommitCheckResult {
  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    if (event.public === false) continue;
    if (!event.created_at) continue;
    if (localDateISO(new Date(event.created_at), timeZone) !== dateISO) {
      continue;
    }
    const commits = event.payload?.commits ?? [];
    const sha = commits.find((c) => c.sha)?.sha;
    if (!sha) continue;
    const repo = event.repo?.name ?? "unknown";
    return { found: true, commitRef: `${repo}@${sha.slice(0, 7)}` };
  }
  return { found: false, commitRef: null };
}

export type EventsFetchResult =
  | { ok: true; events: GitHubEvent[] }
  | { ok: false; status: number };

/**
 * Fetches the user's recent public events. The base URL is overridable only
 * so tests can point at a mock server — production always hits github.com.
 * Unauthenticated calls are fine for one user (60 req/h); GITHUB_TOKEN
 * raises the limit if ever needed.
 */
export async function fetchPublicEvents(
  handle: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EventsFetchResult> {
  const base = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "reps-app",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetchImpl(
      `${base}/users/${encodeURIComponent(handle)}/events/public?per_page=100`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return { ok: false, status: res.status };

    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) return { ok: false, status: 502 };
    return { ok: true, events: body as GitHubEvent[] };
  } catch {
    // Network-level failure (offline, DNS, timeout): verification becomes
    // "unavailable" — it must never crash the loop or fake an answer.
    return { ok: false, status: 0 };
  }
}

/**
 * Checks whether `handle` has a public commit on `dateISO` (user-local).
 * A failed fetch is reported as unknown — never as "no commit", and never
 * as a commit.
 */
export async function checkCommitForDate(
  handle: string,
  dateISO: string,
  timeZone: string,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { status: "checked"; result: CommitCheckResult }
  | { status: "unavailable"; httpStatus: number }
> {
  const fetched = await fetchPublicEvents(handle, fetchImpl);
  if (!fetched.ok) return { status: "unavailable", httpStatus: fetched.status };
  return {
    status: "checked",
    result: findCommitForDate(fetched.events, dateISO, timeZone),
  };
}
