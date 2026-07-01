import Link from "next/link";

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
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <Link
        href="/"
        className="num text-xs text-dim transition-colors hover:text-phos-bright"
      >
        ‹ HOME
      </Link>
      <h1 className="mt-6 font-pixel text-2xl tracking-wider text-phos">
        {title}
      </h1>
      <p className="num mt-2 text-xs text-warn">
        {"// PHASE 2 — not built yet"}
      </p>
      <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-dim">
        {blurb}
      </p>
      <p className="mt-6 border-l-2 border-line pl-3 text-xs leading-relaxed text-faint">
        Deliberate, not forgotten: Phase 1 is the daily loop, and it has to
        survive real use first. This hub arrives in Phase 2 (spec §16).
      </p>
    </main>
  );
}
