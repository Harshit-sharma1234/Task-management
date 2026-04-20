import { Shimmer } from "@/components/ui/Skeleton";

/**
 * ProjectSkeleton perfectly mimics the Table-based ProjectList.
 * Now featuring icon/avatar shapes for better high-fidelity preview
 * and zero textual labels for a cleaner transition.
 */
export function ProjectSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfb] animate-fade-in">
      {/* Header Section (Search & Create Button) */}
      <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex flex-col gap-2">
          {/* Title Placeholder */}
          <Shimmer className="h-7 w-40 rounded-md" />
          {/* Subtitle Placeholder */}
          <Shimmer className="h-3 w-56 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          {/* Search Bar Placeholder */}
          <Shimmer className="h-9 w-60 rounded-lg" />
          {/* New Project Button Placeholder */}
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </header>

      {/* Main Content (Table) */}
      <main className="flex-1 p-8 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Table Header (No text, just abstract bars) */}
          <div className="grid grid-cols-[1fr_100px_140px_140px_140px_48px] items-center border-b border-gray-100 bg-gray-50/50 py-3.5">
            <div className="pl-5"><Shimmer className="h-2 w-10" /></div>
            <div className="hidden md:block"><Shimmer className="h-2 w-14" /></div>
            <div className="hidden sm:block"><Shimmer className="h-2 w-8" /></div>
            <div className="hidden lg:block flex justify-end pr-5 text-right"><Shimmer className="h-2 w-16" /></div>
            <div className="flex justify-end pr-5 text-right"><Shimmer className="h-2 w-12" /></div>
            <div></div>
          </div>

          {/* Row Skeletons (Matching exact structure of SS1/SS2) */}
          <div className="divide-y divide-gray-100">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="grid grid-cols-[1fr_100px_140px_140px_140px_48px] items-center py-4 px-5"
              >
                {/* Name: Folder Icon + Bar */}
                <div className="flex items-center gap-3">
                  <Shimmer className="h-3.5 w-4 rounded-sm" />
                  <Shimmer className="h-3 w-32 rounded" />
                </div>

                {/* Priority: Multiple bars (Signal style) */}
                <div className="hidden md:flex items-center gap-0.5">
                  <Shimmer className="h-1.5 w-1 rounded-t-sm" />
                  <Shimmer className="h-2.5 w-1 rounded-t-sm" />
                  <Shimmer className="h-3.5 w-1 rounded-t-sm opacity-50" />
                </div>

                {/* Lead: Circular Avatar */}
                <div className="hidden sm:block">
                  <Shimmer className="h-6 w-6 rounded-full" />
                </div>

                {/* Start Date: Calendar Icon + Bar */}
                <div className="hidden lg:flex items-center justify-end gap-2 pr-5">
                   <Shimmer className="h-3 w-3 rounded-sm" />
                   <Shimmer className="h-2.5 w-12 rounded" />
                </div>

                {/* Status: Colored Dot + Bar */}
                <div className="flex items-center justify-end gap-2 pr-5">
                  <Shimmer className="h-2 w-2 rounded-full" />
                  <Shimmer className="h-2.5 w-14 rounded" />
                </div>

                {/* Actions: Small button */}
                <div className="flex justify-end">
                   <Shimmer className="h-6 w-6 rounded-md opacity-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
