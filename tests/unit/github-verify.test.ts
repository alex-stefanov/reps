import { describe, expect, it } from "vitest";
import {
  checkCommitForDate,
  fetchPublicEvents,
  findCommitForDate,
  type GitHubEvent,
} from "@/lib/core/github-verify";

const push = (
  createdAt: string,
  overrides: Partial<GitHubEvent> = {},
): GitHubEvent => ({
  type: "PushEvent",
  created_at: createdAt,
  public: true,
  repo: { name: "alex/reps" },
  payload: { commits: [{ sha: "f3a9c21d0b44e8a51c07d9be" }] },
  ...overrides,
});

describe("findCommitForDate", () => {
  it("finds a public push on the requested local day", () => {
    const result = findCommitForDate(
      [push("2026-07-01T14:22:09Z")],
      "2026-07-01",
      "UTC",
    );
    expect(result).toEqual({ found: true, commitRef: "alex/reps@f3a9c21" });
  });

  it("reports nothing when the only pushes are on other days", () => {
    const result = findCommitForDate(
      [push("2026-06-30T23:59:59Z"), push("2026-07-02T00:00:01Z")],
      "2026-07-01",
      "UTC",
    );
    expect(result).toEqual({ found: false, commitRef: null });
  });

  it("respects the user's timezone at the midnight boundary", () => {
    // 23:30 UTC on June 30 is already July 1 in Berlin…
    const lateNightPush = [push("2026-06-30T23:30:00Z")];
    expect(findCommitForDate(lateNightPush, "2026-07-01", "Europe/Berlin").found).toBe(true);
    // …but still June 30 in UTC and Los Angeles.
    expect(findCommitForDate(lateNightPush, "2026-07-01", "UTC").found).toBe(false);
    expect(
      findCommitForDate(lateNightPush, "2026-07-01", "America/Los_Angeles").found,
    ).toBe(false);
    expect(findCommitForDate(lateNightPush, "2026-06-30", "UTC").found).toBe(true);
  });

  it("ignores non-push activity on the right day", () => {
    const events: GitHubEvent[] = [
      { ...push("2026-07-01T10:00:00Z"), type: "WatchEvent" },
      { ...push("2026-07-01T10:00:00Z"), type: "IssuesEvent" },
    ];
    expect(findCommitForDate(events, "2026-07-01", "UTC").found).toBe(false);
  });

  it("ignores pushes with no commits (e.g. branch deletes)", () => {
    const empty = push("2026-07-01T10:00:00Z", { payload: { commits: [] } });
    expect(findCommitForDate([empty], "2026-07-01", "UTC").found).toBe(false);
  });

  it("ignores events explicitly marked non-public", () => {
    const hidden = push("2026-07-01T10:00:00Z", { public: false });
    expect(findCommitForDate([hidden], "2026-07-01", "UTC").found).toBe(false);
  });

  it("finds nothing in an empty feed", () => {
    expect(findCommitForDate([], "2026-07-01", "UTC").found).toBe(false);
  });
});

describe("checkCommitForDate", () => {
  const fetchReturning = (status: number, body: unknown): typeof fetch =>
    (async () =>
      new Response(JSON.stringify(body), { status })) as typeof fetch;

  it("returns a checked result from a live feed", async () => {
    const result = await checkCommitForDate(
      "alex",
      "2026-07-01",
      "UTC",
      fetchReturning(200, [push("2026-07-01T09:00:00Z")]),
    );
    expect(result).toEqual({
      status: "checked",
      result: { found: true, commitRef: "alex/reps@f3a9c21" },
    });
  });

  it("reports API failure as unavailable — never as 'no commit'", async () => {
    const result = await checkCommitForDate(
      "alex",
      "2026-07-01",
      "UTC",
      fetchReturning(403, { message: "rate limited" }),
    );
    expect(result).toEqual({ status: "unavailable", httpStatus: 403 });
  });

  it("treats a malformed payload as unavailable", async () => {
    const result = await checkCommitForDate(
      "alex",
      "2026-07-01",
      "UTC",
      fetchReturning(200, { not: "an array" }),
    );
    expect(result.status).toBe("unavailable");
  });

  it("treats a network-level failure (offline/DNS) as unavailable, not a crash", async () => {
    const failing: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const result = await checkCommitForDate("alex", "2026-07-01", "UTC", failing);
    expect(result).toEqual({ status: "unavailable", httpStatus: 0 });
  });

  it("aborts a hung GitHub connection instead of stalling the render", async () => {
    // A fetch that never resolves on its own — it only settles when the
    // timeout AbortSignal fires. Proves the render path can't hang.
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation timed out.", "TimeoutError")),
        );
      });
    const result = await fetchPublicEvents("alex", hanging, 10);
    expect(result).toEqual({ ok: false, status: 0 });
  });
});
