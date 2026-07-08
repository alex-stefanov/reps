import { HubHeaderSkeleton, Shimmer } from "@/components/skeletons";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-md flex-1 px-5 py-8"
      aria-busy="true"
      aria-label="Loading Ideas"
    >
      <HubHeaderSkeleton />
      {/* Filter chips */}
      <div className="mt-6 flex gap-2">
        {["w-16", "w-12", "w-14", "w-10"].map((w, i) => (
          <Shimmer key={i} className={`h-8 ${w} rounded-full bg-inset`} />
        ))}
      </div>
      {/* Idea cards */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    </main>
  );
}
