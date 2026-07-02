import Link from "next/link";
import { ChevronLeftIcon } from "./icons";

/**
 * Honest Phase 2 placeholder. These hubs are deliberately unbuilt until the
 * Phase 1 loop survives daily use (spec §16) — no fake UI pretending
 * otherwise.
 */
export function PhaseStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link
        href="/"
        aria-label="Back to Home"
        className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
      >
        <ChevronLeftIcon className="size-4" />
      </Link>
      <div className="card-shadow mt-6 rounded-[2rem] bg-card p-6">
        <span className="inline-flex rounded-full bg-warn/15 px-3 py-1 text-xs font-bold text-warn">
          Phase 2 · not built yet
        </span>
        <h1 className="mt-4 text-[1.7rem] font-extrabold tracking-tight text-text">
          {title}
        </h1>
        <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-sub">
          {blurb}
        </p>
        <p className="mt-5 border-l-2 border-hair pl-3 text-xs leading-relaxed text-mute">
          Deliberate, not forgotten: Phase 1 is the daily loop, and it has to
          survive real use first. This hub arrives in Phase 2 (spec §16).
        </p>
      </div>
    </main>
  );
}
