import { Shimmer } from "@/components/ui/Skeleton";

export function ProjectSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfb] animate-fade-in">
      {/* Search and Filters placeholder */}
      <div className="px-8 py-6 flex justify-between items-center h-20 shrink-0">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <div className="flex gap-3">
          {[1, 2, 3].map(i => <Shimmer key={i} className="h-8 w-24 rounded-lg" />)}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="px-8 flex-1 overflow-auto pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-6 flex flex-col justify-between h-[280px]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shimmer className="h-10 w-10 rounded-xl" />
                  <Shimmer className="h-6 w-3/4 rounded-md" />
                </div>
                <div className="space-y-2">
                   <Shimmer className="h-3 w-full" />
                   <Shimmer className="h-3 w-4/5" />
                </div>
              </div>
              
              <div className="space-y-4">
                 <div className="flex justify-between items-center h-4">
                    <Shimmer className="h-3 w-20" />
                    <Shimmer className="h-3 w-12" />
                 </div>
                 <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                    <Shimmer className="h-full w-1/3" />
                 </div>
                 <div className="flex justify-between items-center pt-2">
                    <div className="flex -space-x-2">
                       {[1, 2, 3].map(j => <Shimmer key={j} className="h-8 w-8 rounded-full border-2 border-white" />)}
                    </div>
                    <Shimmer className="h-4 w-16 px-2 py-0.5 rounded-full" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
