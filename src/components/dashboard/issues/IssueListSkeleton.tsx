import { Shimmer } from "@/components/ui/Skeleton";

/**
 * IssueListSkeleton provides a high-fidelity preview of the grouped Issues list.
 * It matches section headers and row structure (48px height) to prevent layout shifts.
 */
export function IssueListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#fbfbfb] animate-fade-in">
      {/* Issues Sub-Header (Filters, Display, New Issue) */}
      <div className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
            {[14, 10, 12].map((w, i) => (
               <Shimmer key={i} className={`h-7 w-${w} rounded-md`} />
            ))}
        </div>
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-20 rounded-md opacity-60" />
          <Shimmer className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Main List Area with Section Groups */}
      <div className="flex-1 overflow-hidden pt-6 px-8">
        
        {/* Section 1 (e.g., BACKLOG) */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-3">
              <Shimmer className="h-4 w-4 rounded-full opacity-40 translate-x-3" />
              <Shimmer className="h-3 w-20 rounded ml-4" />
              <Shimmer className="h-4 w-6 rounded-full opacity-20" />
           </div>
           <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm overflow-hidden">
              {[...Array(2)].map((_, i) => <IssueRowSkeleton key={i} />)}
           </div>
        </div>

        {/* Section 2 (e.g., TODO) */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-3">
              <Shimmer className="h-4 w-4 rounded-full opacity-40 translate-x-3" />
              <Shimmer className="h-3 w-16 rounded ml-4" />
              <Shimmer className="h-4 w-6 rounded-full opacity-20" />
           </div>
           <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm overflow-hidden">
              {[...Array(5)].map((_, i) => <IssueRowSkeleton key={i} />)}
           </div>
        </div>
      </div>
    </div>
  );
}

/**
 * High-fidelity row skeleton matching the 48px IssueRow.
 */
function IssueRowSkeleton() {
    return (
        <div className="h-[48px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                {/* Selection Checkbox Mock */}
                <Shimmer className="h-4 w-4 rounded shrink-0 opacity-10" />

                {/* Priority Signal Bars */}
                <div className="hidden md:flex items-center gap-0.5 shrink-0 px-2 opacity-40">
                    <Shimmer className="h-1.5 w-1 rounded-t-sm" />
                    <Shimmer className="h-2.5 w-1 rounded-t-sm" />
                    <Shimmer className="h-3.5 w-1 rounded-t-sm opacity-50" />
                </div>

                {/* Project ID Bar */}
                <Shimmer className="h-3 w-12 rounded opacity-30 shrink-0" />

                {/* Status Shape */}
                <Shimmer className="h-3 w-16 rounded shrink-0 opacity-30" />

                {/* Title Line */}
                <Shimmer className="h-3 w-64 rounded opacity-60" />
            </div>

            <div className="flex items-center gap-6 shrink-0 pr-2">
                {/* Project Pill */}
                <Shimmer className="h-6 w-24 rounded-md opacity-20" />
                
                {/* Avatar Circle */}
                <Shimmer className="h-6 w-6 rounded-full opacity-50" />

                {/* Date Shimmer */}
                <Shimmer className="h-3 w-12 rounded opacity-30" />
            </div>
        </div>
    );
}
