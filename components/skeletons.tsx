/**
 * Route-loading skeletons (perceived performance). Rendered by each hub's
 * `loading.tsx` while its server component awaits data, so navigation shows an
 * instant layout-matched placeholder instead of a blank stall. The pulse is
 * neutralized under `prefers-reduced-motion` by the global rule in globals.css.
 */

/** A single shimmer block; compose these to mirror a screen's real layout. */
export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-hair ${className}`} />;
}

/** The shared hub header: back button, title/subtitle, add button. */
export function HubHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Shimmer className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-6 w-28" />
        <Shimmer className="h-3 w-44 bg-inset" />
      </div>
      <Shimmer className="size-10 rounded-full" />
    </div>
  );
}
