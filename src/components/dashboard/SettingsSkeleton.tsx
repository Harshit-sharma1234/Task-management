import { Shimmer } from "@/components/ui/Skeleton";

export function SettingsSkeleton() {
  return (
    <div className="p-4 sm:p-8 xl:p-10 w-full max-w-7xl mx-auto min-h-screen animate-fade-in flex flex-col items-center">
      <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full flex flex-col lg:flex-row overflow-hidden min-h-0 lg:min-h-[700px] border border-gray-100/50">
      {/* Sidebar Skeleton */}
      <div className="w-full lg:w-[260px] bg-[#f9fafb]/50 border-b lg:border-b-0 lg:border-r border-gray-100 p-4 sm:p-6 shrink-0">
        <div className="mb-6 lg:mb-10">
          <Shimmer className="h-6 w-32 rounded-md mb-2" />
          <Shimmer className="hidden lg:block h-3 w-24 rounded-sm opacity-60" />
        </div>
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0">
          {[1, 2, 3].map(i => (
            <Shimmer key={i} className="h-10 w-24 lg:w-full rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-5 sm:p-10 space-y-10">
        <div className="space-y-3">
          <Shimmer className="h-8 w-48 rounded-lg" />
          <Shimmer className="h-4 w-64 rounded-md opacity-60" />
        </div>

        <div className="space-y-8 pt-4">
          {/* Profile Section Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-8 border-b border-gray-50">
            <div className="lg:w-[110px] shrink-0">
              <Shimmer className="h-4 w-12 rounded-sm" />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-[0_2px_25px_rgba(0,0,0,0.03)] gap-8">
              <div className="flex items-center gap-6">
                <Shimmer className="h-14 sm:h-16 w-14 sm:w-16 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-2 ring-white shrink-0" />
                <div className="space-y-2">
                  <Shimmer className="h-5 w-32 sm:w-40 rounded-md" />
                  <Shimmer className="h-3 w-40 sm:w-56 rounded-md opacity-60" />
                </div>
              </div>
              <Shimmer className="h-11 w-full sm:w-32 rounded-xl shrink-0" />
            </div>
          </div>

          {/* Additional Section Skeletons */}
          {[1, 2].map(i => (
            <div key={i} className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="lg:w-[110px] shrink-0">
                <Shimmer className="h-4 w-12 rounded-sm" />
              </div>
              <Shimmer className="h-14 flex-1 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
