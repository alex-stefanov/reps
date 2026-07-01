/**
 * Date plumbing for the daily loop. Everything user-facing runs on ISO date
 * strings ("YYYY-MM-DD") in the *user's* timezone — "today" is a product
 * concept, not a server concept (spec §13, open question 7).
 */

/** The calendar date of an instant in a given IANA timezone. */
export function localDateISO(instant: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function todayISO(timeZone: string): string {
  return localDateISO(new Date(), timeZone);
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDaysISO(a: string, b: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[isoWeekday(iso)];
}
