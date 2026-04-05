import { Shimmer } from "@/components/ui/Skeleton";

export function ContentAreaSkeleton() {
  return (
    <div className="p-8 h-full w-full bg-[#fbfbfb] flex flex-col gap-8 animate-fade-in">
      <div className="flex justify-between items-center shrink-0">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <Shimmer className="h-10 w-32 rounded-lg" />
      </div>
      
      <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden p-6 space-y-6">
        <Shimmer className="h-10 w-full rounded-xl" />
        <div className="space-y-4 pt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Shimmer className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-4 w-1/3" />
                <Shimmer className="h-3 w-1/2 opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
