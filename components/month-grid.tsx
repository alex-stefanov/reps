import type { MonthCell } from "@/lib/server/home-view";

/**
 * "This month" — the contribution grid (spec §6.1), Monday-aligned.
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
  const pretty = label.charAt(0) + label.slice(1).toLowerCase();

  return (
    <section
      aria-label={`Contribution grid for ${label}`}
      className="card-shadow rounded-3xl bg-card p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-text">
          {pretty}
        </h2>
        <span className="num text-xs font-bold text-sub">
          {litDays} day{litDays === 1 ? "" : "s"} lit
        </span>
      </div>

      <div className="num mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-mute">
        {["M", "T", "W", "T", "F", "S", "S"].map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {cells.map((cell) => (
          <span
            key={cell.date}
            title={`${cell.date} · level ${cell.level}`}
            data-level={cell.level}
            className={`aspect-square rounded-lg ${
              cell.isFuture ? "bg-cell-0/50" : LEVEL_BG[Math.min(cell.level, 4)]
            } ${cell.isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-card" : ""}`}
          />
        ))}
      </div>
    </section>
  );
}
