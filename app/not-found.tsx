import Image from "next/image";
import Link from "next/link";

/**
 * 404 boundary. An unknown route lands on a styled, on-brand page with a
 * way back into the loop — never Next's bare default.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
      <div className="relative size-40">
        <Image
          src="/character/idle.webp"
          alt="Your builder, looking for the page you asked for"
          fill
          unoptimized
          priority
          draggable={false}
          className="object-contain"
          sizes="160px"
        />
      </div>
      <p className="num mt-6 text-sm font-bold uppercase tracking-wide text-mute">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text">
        This page wandered off the plan.
      </h1>
      <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-sub">
        The page you&rsquo;re after doesn&rsquo;t exist — let&rsquo;s get you
        back to today.
      </p>
      <Link
        href="/"
        className="card-shadow mt-8 w-full max-w-xs rounded-2xl bg-text py-4 text-[15px] font-bold text-card transition-transform active:scale-[0.98]"
      >
        Back to today
      </Link>
    </main>
  );
}
