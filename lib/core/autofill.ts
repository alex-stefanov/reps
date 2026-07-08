/**
 * Schedule autofill (spec §9.4, §8.2): pack ideas from the pool into the
 * program's Project Work weeks, each idea taking as many weeks as its
 * estimated hours need at the plan's project capacity. Deterministic — the
 * spec frames this as "AI autofill," but the honest mechanic is a greedy
 * packer; an LLM-ranked variant would layer on top of this, not replace it.
 * Pure: no framework, no DB.
 */

export interface AutofillIdea {
  id: string;
  hours: number | null;
}

export interface AutofillAssignment {
  ideaId: string;
  startWeekIndex: number;
  weekCount: number;
}

/** When an idea has no estimate, assume a fortnight's worth of project time. */
const DEFAULT_WEEKS_IF_UNKNOWN = 2;

export interface AutofillParams {
  /** Pool order = placement order; the user curates the pool to steer this. */
  ideas: AutofillIdea[];
  /** Project-track hours the plan budgets per week (encodes intensity). */
  projectHoursPerWeek: number;
  /** First week to fill — normally the current program week. */
  startWeekIndex: number;
  totalWeeks: number;
  /**
   * Longest run any single idea may claim. Without it a big idea against a
   * low weekly budget swallows the whole horizon, defeating the point of
   * spreading the pool. The caller sets this to ~a third of the program.
   */
  maxRunWeeks?: number;
}

/**
 * Greedy fill from `startWeekIndex` forward: each idea claims a contiguous
 * run of weeks sized to its hours (capped by `maxRunWeeks`), the next idea
 * starts where the last left off, and packing stops when the program runs
 * out of weeks. Ideas that don't fit are left unassigned (the caller reports
 * the leftover count). A capped big idea keeps its stretch; extend it by
 * hand if you want more.
 */
export function planAutofill(params: AutofillParams): AutofillAssignment[] {
  const { ideas, projectHoursPerWeek, startWeekIndex, totalWeeks } = params;
  const perWeek = projectHoursPerWeek > 0 ? projectHoursPerWeek : 1;
  const maxRun =
    params.maxRunWeeks && params.maxRunWeeks > 0
      ? Math.floor(params.maxRunWeeks)
      : Infinity;

  const assignments: AutofillAssignment[] = [];
  let cursor = Math.max(0, Math.floor(startWeekIndex));

  for (const idea of ideas) {
    if (cursor >= totalWeeks) break;
    const need =
      idea.hours && idea.hours > 0
        ? Math.ceil(idea.hours / perWeek)
        : DEFAULT_WEEKS_IF_UNKNOWN;
    const weekCount = Math.min(
      Math.max(need, 1),
      maxRun,
      totalWeeks - cursor,
    );
    assignments.push({
      ideaId: idea.id,
      startWeekIndex: cursor,
      weekCount,
    });
    cursor += weekCount;
  }

  return assignments;
}
