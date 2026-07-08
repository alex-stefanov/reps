import { Shimmer } from "@/components/skeletons";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-8"
      aria-busy="true"
      aria-label="Loading Schedule"
    >
      {/* Title row + week/month toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-7 w-40" />
          <Shimmer className="h-3 w-28 bg-inset" />
        </div>
        <Shimmer className="h-9 w-32 rounded-full bg-inset" />
      </div>
      {/* Seven day columns */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={i} className="h-40 rounded-2xl md:h-64" />
        ))}
      </div>
    </main>
  );
}
