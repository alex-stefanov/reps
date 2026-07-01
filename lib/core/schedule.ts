import type { Intensity, Track } from "@/lib/db/schema";
import { addDaysISO } from "./dates";

/**
 * Schedule generation (spec §8.2, §8.4): onboarding answers in, a dated
 * program out. Pure and deterministic — same params, same plan — so it can
 * be unit-tested and regenerated without surprises.
 *
 * Cadence rules from the spec: BYOX 2–3×/week, LeetCode every other day,
 * LinkedIn ~3×/week. Intensity changes how many building sessions land per
 * week; hours/week sets how heavy each session is.
 */

export interface GenerationParams {
  hoursPerWeek: number;
  intensity: Intensity;
  /** ISO date of Day 1 (user-local). */
  startDate: string;
  weeks?: number;
  /** When the LeetCode track is toggled off, no LeetCode tasks are generated. */
  leetcodeOn?: boolean;
}

export interface GeneratedTask {
  track: Track;
  label: string;
  hours: number;
}

export interface GeneratedDay {
  date: string;
  weekIndex: number;
  note: string | null;
  tasks: GeneratedTask[];
}

export const TRACK_LABELS: Record<Track, string> = {
  byox: "BYOX work",
  project: "Project work",
  leetcode: "LeetCode",
  linkedin: "Post on LinkedIn",
};

export const DEFAULT_WEEKS = 12;

/** Session length floor — a 15-minute "BYOX session" isn't a real session. */
const MIN_SESSION_HOURS = 0.5;
const LINKEDIN_SESSION_HOURS = 0.5;

/** Which day-of-program-week (0–6) each track lands on, by intensity. */
const PLACEMENT: Record<
  Intensity,
  { byox: number[]; project: number[]; linkedin: number[] }
> = {
  chill: { byox: [1, 4], project: [5], linkedin: [2, 5] },
  steady: { byox: [1, 3, 5], project: [2, 6], linkedin: [0, 2, 4] },
  grind: { byox: [1, 3, 5], project: [0, 2, 4], linkedin: [0, 3, 5] },
};

/** Share of non-LinkedIn hours per building track. */
const HOUR_SPLIT = { byox: 0.45, project: 0.25, leetcode: 0.3 };

function roundToHalf(hours: number): number {
  return Math.max(MIN_SESSION_HOURS, Math.round(hours * 2) / 2);
}

export function generateSchedule(params: GenerationParams): GeneratedDay[] {
  const { hoursPerWeek, intensity, startDate } = params;
  const weeks = params.weeks ?? DEFAULT_WEEKS;
  const leetcodeOn = params.leetcodeOn ?? true;
  const placement = PLACEMENT[intensity];

  const days: GeneratedDay[] = [];

  for (let week = 0; week < weeks; week++) {
    // LeetCode runs on global every-other-day parity so the rhythm is
    // continuous across week boundaries.
    const leetOffsets = [0, 1, 2, 3, 4, 5, 6].filter(
      (offset) => leetcodeOn && (week * 7 + offset) % 2 === 0,
    );

    const linkedinHours = placement.linkedin.length * LINKEDIN_SESSION_HOURS;
    const buildingHours = Math.max(hoursPerWeek - linkedinHours, 1);
    const leetShare = leetcodeOn ? HOUR_SPLIT.leetcode : 0;
    const scale = 1 / (HOUR_SPLIT.byox + HOUR_SPLIT.project + leetShare);

    const sessionHours = {
      byox: roundToHalf(
        (buildingHours * HOUR_SPLIT.byox * scale) / placement.byox.length,
      ),
      project: roundToHalf(
        (buildingHours * HOUR_SPLIT.project * scale) / placement.project.length,
      ),
      leetcode: leetOffsets.length
        ? roundToHalf(
            (buildingHours * leetShare * scale) / leetOffsets.length,
          )
        : 0,
    };

    for (let offset = 0; offset < 7; offset++) {
      const tasks: GeneratedTask[] = [];

      if (placement.byox.includes(offset)) {
        tasks.push({
          track: "byox",
          label: TRACK_LABELS.byox,
          hours: sessionHours.byox,
        });
      }
      if (placement.project.includes(offset)) {
        tasks.push({
          track: "project",
          label: TRACK_LABELS.project,
          hours: sessionHours.project,
        });
      }
      if (leetOffsets.includes(offset)) {
        tasks.push({
          track: "leetcode",
          label: TRACK_LABELS.leetcode,
          hours: sessionHours.leetcode,
        });
      }
      if (placement.linkedin.includes(offset)) {
        tasks.push({
          track: "linkedin",
          label: TRACK_LABELS.linkedin,
          hours: LINKEDIN_SESSION_HOURS,
        });
      }

      days.push({
        date: addDaysISO(startDate, week * 7 + offset),
        weekIndex: week,
        note: tasks.length === 0 ? "Rest" : null,
        tasks,
      });
    }
  }

  return days;
}

export function dayTotalHours(tasks: { hours: number }[]): number {
  return tasks.reduce((sum, t) => sum + t.hours, 0);
}
