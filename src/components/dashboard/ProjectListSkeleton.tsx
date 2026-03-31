'use client';

export function ProjectListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
      {/* List Header Skeleton */}
      <div className="flex items-center border-b border-gray-100 bg-gray-50/50 py-3 text-xs font-medium text-gray-500 rounded-t-lg">
        <div className="flex-1 min-w-[200px] pl-5">
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="w-32 hidden md:block">
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="w-24 hidden md:block">
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="w-32 hidden sm:block">
          <div className="h-3 w-10 bg-gray-200 rounded"></div>
        </div>
        <div className="w-32 hidden lg:block">
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="w-24 text-right pr-5">
           <div className="h-3 w-10 ml-auto bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* List Body Skeleton (6 rows) */}
      <div className="divide-y divide-gray-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center py-4 px-5">
            {/* Name */}
            <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <div className="h-4 w-4 bg-gray-100 rounded"></div>
              <div className="h-4 w-40 bg-gray-100 rounded"></div>
            </div>
            
            {/* Health */}
            <div className="w-32 hidden md:flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-full border border-gray-200"></div>
              <div className="h-3 w-16 bg-gray-50 rounded"></div>
            </div>
            
            {/* Priority */}
            <div className="w-24 hidden md:flex items-center">
              <div className="h-5 w-16 bg-gray-100 rounded-full"></div>
            </div>
            
            {/* Lead */}
            <div className="w-32 hidden sm:flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-100"></div>
              <div className="h-3 w-16 bg-gray-50 rounded"></div>
            </div>
            
            {/* Target date */}
            <div className="w-32 hidden lg:flex items-center gap-2">
              <div className="h-3 w-20 bg-gray-50 rounded"></div>
            </div>
            
            {/* Status */}
            <div className="w-24 flex items-center justify-end gap-2">
              <div className="h-3.5 w-3.5 rounded-full border border-gray-200"></div>
              <div className="h-3 w-8 bg-gray-50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
