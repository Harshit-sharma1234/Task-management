import { Shimmer } from '@/components/ui/Skeleton';

export function ProjectOverviewSkeleton() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 bg-white">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Shimmer className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Shimmer className="h-8 w-2/3 rounded-md" />
            <Shimmer className="h-4 w-1/3 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Shimmer className="w-16 h-3 rounded-sm" />
              <Shimmer className="w-40 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-3 w-28 rounded-sm" />
          <Shimmer className="h-8 w-28 rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-gray-100 bg-gray-50/30"
            >
              <Shimmer className="w-28 h-4 rounded-md" />
              <Shimmer className="w-full h-3 mt-2 rounded-md" />
              <Shimmer className="w-10 h-10 rounded-md mt-3" />
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-6">
          <Shimmer className="h-3 w-32 rounded-sm" />
          <Shimmer className="h-12 w-full rounded-md" />
          <Shimmer className="h-12 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

