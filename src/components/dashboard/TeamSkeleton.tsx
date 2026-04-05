import { Shimmer } from "@/components/ui/Skeleton";

export function TeamSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-3">
          <Shimmer className="h-10 w-48 rounded-lg" />
          <Shimmer className="h-4 w-64 rounded-md opacity-60" />
        </div>
        <Shimmer className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats row or filters */}
      <div className="flex gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Team List with Search */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
        <div className="p-4 border-b">
          <Shimmer className="h-10 w-full rounded-xl" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-4">
              <Shimmer className="h-12 w-12 rounded-full border-2 border-white" />
              <div className="space-y-2">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-8 pr-4">
              <div className="space-y-2">
                 <Shimmer className="h-3 w-20" />
                 <Shimmer className="h-4 w-24" />
              </div>
              <Shimmer className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
