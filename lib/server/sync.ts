import { and, eq } from "drizzle-orm";
import { todayISO } from "@/lib/core/dates";
import { checkCommitForDate } from "@/lib/core/github-verify";
import { getDb } from "@/lib/db/client";
import {
  commitVerifications,
  standingTasks,
  type CommitVerification,
  type User,
} from "@/lib/db/schema";
import { ensureStandingTasks, recomputeDayCompletion } from "./day";

export type SyncOutcome =
  | "verified" // commit found; task checked off
  | "already-verified" // nothing to do
  | "not-found" // checked, no public commit yet today
  | "throttled" // checked recently; skipped
  | "unavailable" // GitHub API unreachable; state untouched
  | "disabled"; // daily-commit toggle is off

const THROTTLE_MS = 5 * 60_000;

/**
 * The sync pass (spec §13): runs on Home load and from the cron endpoint.
 * Auto-checks the Commit standing task when — and only when — a real public
 * commit exists for the user's current local day.
 */
export async function syncCommitVerification(
  user: User,
  opts: { force?: boolean } = {},
): Promise<SyncOutcome> {
  if (!user.dailyCommitOn) return "disabled";

  const db = await getDb();
  const today = todayISO(user.timezone);
  await ensureStandingTasks(user, today);

  const existing = await db.query.commitVerifications.findFirst({
    where: and(
      eq(commitVerifications.userId, user.id),
      eq(commitVerifications.date, today),
    ),
  });
  if (existing?.commitFound) return "already-verified";
  if (
    !opts.force &&
    existing &&
    Date.now() - existing.checkedAt.getTime() < THROTTLE_MS
  ) {
    return "throttled";
  }

  const check = await checkCommitForDate(
    user.githubHandle,
    today,
    user.timezone,
  );
  // API trouble leaves the verification state untouched: pending, not "no".
  if (check.status === "unavailable") return "unavailable";

  const { found, commitRef } = check.result;
  const checkedAt = new Date();
  await db
    .insert(commitVerifications)
    .values({
      userId: user.id,
      date: today,
      commitFound: found,
      commitRef,
      checkedAt,
    })
    .onConflictDoUpdate({
      target: [commitVerifications.userId, commitVerifications.date],
      set: { commitFound: found, commitRef, checkedAt },
    });

  if (found) {
    await db
      .update(standingTasks)
      .set({
        status: "done",
        verified: true,
        verificationSource: "github",
        doneAt: checkedAt,
      })
      .where(
        and(
          eq(standingTasks.userId, user.id),
          eq(standingTasks.type, "commit"),
          eq(standingTasks.date, today),
        ),
      );
    await recomputeDayCompletion(user, today);
    return "verified";
  }

  return "not-found";
}

export async function getTodayVerification(
  user: User,
): Promise<CommitVerification | undefined> {
  const db = await getDb();
  return db.query.commitVerifications.findFirst({
    where: and(
      eq(commitVerifications.userId, user.id),
      eq(commitVerifications.date, todayISO(user.timezone)),
    ),
  });
}
