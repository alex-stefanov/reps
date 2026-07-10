"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Route error boundary (spec best-practice: loading/empty/error/success).
 * Any thrown error in a page bubbles here instead of Next's bare default —
 * a friendly, recoverable state in the Clay & Glass voice with a retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for logs; the user still sees the recover-and-retry state.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
      <div className="relative size-40">
        <Image
          src="/character/slump.webp"
          alt="Your builder, deflated after something broke"
          fill
          unoptimized
          priority
          draggable={false}
          className="object-contain"
          sizes="160px"
        />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-text">
        That rep didn&rsquo;t land.
      </h1>
      <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-sub">
        Something broke on our side. Your streak is safe — give it another go.
      </p>
      <button
        type="button"
        onClick={reset}
        className="card-shadow mt-8 w-full max-w-xs rounded-2xl bg-text py-4 text-[15px] font-bold text-card transition-transform active:scale-[0.98]"
      >
        Try again
      </button>
      <Link
        href="/"
        className="mt-3 text-sm font-bold text-sub transition-colors hover:text-text"
      >
        Back to today
      </Link>
    </main>
  );
}
