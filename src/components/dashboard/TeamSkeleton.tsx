import { Shimmer } from "@/components/ui/Skeleton";

export function TeamSkeleton() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 w-full h-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 sm:mb-2 gap-4 sm:gap-0">
        <div className="space-y-3">
          <Shimmer className="h-10 w-48 rounded-lg" />
          <Shimmer className="h-4 w-64 rounded-md opacity-60" />
        </div>
        <Shimmer className="h-10 w-full sm:w-32 rounded-lg" />
      </div>

      {/* Stats row or filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Team List Table Skeleton */}
      <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 border-b border-gray-100 px-3 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Shimmer className="h-3 w-20 rounded-sm opacity-40" />
          <Shimmer className="h-3 w-32 rounded-sm opacity-40 hidden md:block" />
          <Shimmer className="h-3 w-16 rounded-sm opacity-40" />
          <Shimmer className="h-3 w-12 rounded-sm opacity-40" />
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="px-3 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Shimmer className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Shimmer className="h-4 w-32 rounded-md" />
                  <Shimmer className="h-3 w-24 rounded-md opacity-60 md:hidden" />
                </div>
              </div>
              <Shimmer className="h-4 w-40 rounded-md opacity-40 hidden md:block shrink-0" />
              <div className="w-[140px] shrink-0">
                <Shimmer className="h-8 w-24 rounded-lg opacity-40" />
              </div>
              <Shimmer className="h-8 w-8 rounded-lg opacity-40 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
