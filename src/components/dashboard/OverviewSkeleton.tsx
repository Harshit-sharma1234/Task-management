import { Shimmer } from "@/components/ui/Skeleton";

export function OverviewSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-8 w-64" />
        </div>
        <Shimmer className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-5 w-5 rounded-full" />
            </div>
            <Shimmer className="h-8 w-20" />
            <Shimmer className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Activity/Chart Placeholder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <Shimmer className="h-5 w-40" />
              <Shimmer className="h-8 w-24 rounded-md" />
            </div>
            <Shimmer className="h-[300px] w-full rounded-lg" />
          </div>
          
          <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm space-y-4">
             <Shimmer className="h-5 w-32" />
             <div className="space-y-3">
                {[1, 2, 3].map(i => (
                   <div key={i} className="flex items-center gap-4 py-2">
                      <Shimmer className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                         <Shimmer className="h-4 w-1/3" />
                         <Shimmer className="h-3 w-1/2 opacity-60" />
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-6">
           <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm space-y-4">
              <Shimmer className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-4">
                 {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1">
                       <Shimmer className="h-3 w-12" />
                       <Shimmer className="h-5 w-16" />
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm space-y-4">
              <Shimmer className="h-5 w-24" />
              <div className="space-y-2">
                 {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-2">
                       <Shimmer className="h-2 w-2 rounded-full" />
                       <Shimmer className="h-4 w-full" />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
