import { HubHeaderSkeleton, Shimmer } from "@/components/skeletons";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-md flex-1 px-5 py-8"
      aria-busy="true"
      aria-label="Loading Finance"
    >
      <HubHeaderSkeleton />
      <div className="mt-6 space-y-4">
        <Shimmer className="h-11 rounded-2xl bg-inset" />
        <Shimmer className="h-28 rounded-3xl" />
        <Shimmer className="h-40 rounded-3xl" />
        <Shimmer className="h-56 rounded-3xl" />
      </div>
    </main>
  );
}
