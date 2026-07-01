import { addDaysISO } from "./dates";

/**
 * Day-completion math: contribution levels for the grid and streaks for the
 * character (spec §12 DayCompletion). Defaults chosen for spec open questions,
 * flagged in the README:
 *  - Q2: the grid colors from *all task completion* (done/total ratio), with
 *    the verified Commit task counting as one task among them.
 *  - Streak definition: a day counts when every task that day is done; a day
 *    with no tasks (Rest) neither extends nor breaks a streak. Today being
 *    incomplete doesn't break the streak until it's over.
 */

export interface DayStat {
  date: string;
  tasksDone: number;
  tasksTotal: number;
}

/** 0–4, GitHub-grid style. Any progress lights the cell at least level 1. */
export function contributionLevel(done: number, total: number): number {
  if (total <= 0 || done <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil((done / total) * 4)));
}

function isComplete(stat: DayStat | undefined): boolean {
  return !!stat && stat.tasksTotal > 0 && stat.tasksDone >= stat.tasksTotal;
}

function isRest(stat: DayStat | undefined): boolean {
  return !stat || stat.tasksTotal === 0;
}

export interface StreakState {
  /** Current streak in completed days (today included once complete). */
  current: number;
  /** True when a streak existed and yesterday broke it — character slumps. */
  justLost: boolean;
}

export function computeStreak(stats: DayStat[], todayISO: string): StreakState {
  const byDate = new Map(stats.map((s) => [s.date, s]));

  const countBack = (from: string): number => {
    let streak = 0;
    let cursor = from;
    // Walk backwards; Rest days pass through without counting.
    for (let guard = 0; guard < 400; guard++) {
      const stat = byDate.get(cursor);
      if (isComplete(stat)) {
        streak++;
      } else if (!isRest(stat)) {
        break;
      }
      cursor = addDaysISO(cursor, -1);
    }
    return streak;
  };

  const yesterday = addDaysISO(todayISO, -1);
  const today = byDate.get(todayISO);
  const current = isComplete(today)
    ? countBack(todayISO)
    : countBack(yesterday);

  // "Just lost": yesterday had tasks and wasn't finished, but the days
  // before it were a streak.
  const yStat = byDate.get(yesterday);
  const justLost =
    !isComplete(yStat) &&
    !isRest(yStat) &&
    countBack(addDaysISO(yesterday, -1)) > 0;

  return { current, justLost };
}
