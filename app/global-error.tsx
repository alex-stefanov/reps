"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Global error boundary — catches failures in the root layout itself, where
 * the normal error.tsx can't render. It replaces the root layout, so it must
 * supply its own <html>/<body>. Kept dependency-free for the worst case.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-base px-6 text-center font-sans text-text">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/character/slump.webp"
          alt="Your builder, deflated after something broke"
          width={160}
          height={160}
          draggable={false}
          className="object-contain"
        />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">
          Something went sideways.
        </h1>
        <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-sub">
          The app hit an unexpected error. Reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={reset}
          className="card-shadow mt-8 w-full max-w-xs rounded-2xl bg-text py-4 text-[15px] font-bold text-card transition-transform active:scale-[0.98]"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
