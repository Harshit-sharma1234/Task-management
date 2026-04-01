'use client';

export function IssueListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#fbfbfb] animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white sticky top-0 z-10 w-full">
        <div className="flex items-center gap-4">
          <div className="h-5 w-24 bg-gray-200 rounded"></div>
          <div className="h-5 w-8 bg-gray-100 rounded-full"></div>
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-md"></div>
      </div>

      {/* List Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl w-full">
        {[...Array(3)].map((_, groupIndex) => (
          <div key={groupIndex} className="mb-8 last:mb-0">
            {/* Project Group Header Skeleton */}
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-6 bg-gray-100 rounded"></div>
            </div>

            {/* Issues List Skeleton */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm divide-y divide-gray-100">
              {[...Array(groupIndex === 0 ? 4 : 2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-16 bg-gray-100 rounded"></div>
                      <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="h-4 w-4 bg-gray-100 rounded"></div>
                    <div className="h-6 w-6 rounded-full bg-gray-100"></div>
                    <div className="h-3 w-12 bg-gray-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
