import { Shimmer } from "@/components/ui/Skeleton";

export function IssueListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-100 animate-fade-in">
      {/* Search and Filters placeholder */}
      <div className="px-4 py-3 border-b flex justify-between items-center h-14 shrink-0">
        <Shimmer className="h-8 w-64 rounded-md" />
        <div className="flex gap-2">
          <Shimmer className="h-8 w-24 rounded-md" />
          <Shimmer className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* List content shimmer rows */}
      <div className="flex-1 overflow-hidden divide-y divide-gray-50">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4 transition-colors">
            <div className="flex items-center gap-3 shrink-0">
               <Shimmer className="h-5 w-5 rounded-md" />
               <Shimmer className="h-4 w-4 rounded-md opacity-40 text-xs text-center" />
            </div>
            <div className="flex-1 flex items-center min-w-0">
               <Shimmer className="h-5 w-full max-w-[400px] mb-1" />
            </div>
            <div className="flex items-center gap-6 shrink-0 opacity-60">
               <Shimmer className="h-4 w-20 rounded-full" />
               <Shimmer className="h-4 w-20 rounded-full" />
               <Shimmer className="h-4 w-12" />
               <Shimmer className="h-7 w-7 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
