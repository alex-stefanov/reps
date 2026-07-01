import type { MonthCell } from "@/lib/server/home-view";

/**
 * "This month" — the GitHub-style grid (spec §6.1), Monday-aligned.
 * Levels come from DayCompletion ratios (default for spec open Q2).
 */

const LEVEL_BG = [
  "bg-cell-0",
  "bg-cell-1",
  "bg-cell-2",
  "bg-cell-3",
  "bg-cell-4",
];

export function MonthGrid({
  label,
  leading,
  cells,
}: {
  label: string;
  leading: number;
  cells: MonthCell[];
}) {
  const litDays = cells.filter((c) => c.level > 0).length;

  return (
    <section aria-label={`Contribution grid for ${label}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-pixel text-[11px] tracking-wider text-dim">
          THIS MONTH <span className="text-faint">· {label}</span>
        </h2>
        <span className="num text-xs text-faint">
          {litDays} day{litDays === 1 ? "" : "s"} lit
        </span>
      </div>

      <div className="num mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-faint">
        {["M", "T", "W", "T", "F", "S", "S"].map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {cells.map((cell) => (
          <span
            key={cell.date}
            title={`${cell.date} · level ${cell.level}`}
            data-level={cell.level}
            className={`aspect-square ${
              cell.isFuture ? "bg-cell-0/40" : LEVEL_BG[Math.min(cell.level, 4)]
            } ${cell.isToday ? "outline outline-1 outline-phos" : ""}`}
          />
        ))}
      </div>
    </section>
  );
}
