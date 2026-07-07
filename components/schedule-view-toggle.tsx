import Link from "next/link";

/** Week ⇄ Month switch (spec §8.1, top-right). URL-driven so it's shareable. */
export function ScheduleViewToggle({
  active,
  weekIndex,
}: {
  active: "week" | "month";
  /** Preserve the week the user was on when they flip back to Week. */
  weekIndex: number;
}) {
  const base =
    "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors";
  return (
    <div className="card-shadow flex rounded-full bg-card p-1">
      <Link
        href={`/schedule?w=${weekIndex}`}
        aria-current={active === "week"}
        data-testid="view-week"
        className={
          active === "week"
            ? `${base} bg-text text-card`
            : `${base} text-sub hover:text-text`
        }
      >
        Week
      </Link>
      <Link
        href="/schedule?v=month"
        aria-current={active === "month"}
        data-testid="view-month"
        className={
          active === "month"
            ? `${base} bg-text text-card`
            : `${base} text-sub hover:text-text`
        }
      >
        Month
      </Link>
    </div>
  );
}
