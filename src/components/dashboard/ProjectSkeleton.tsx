'use client';

export function ProjectSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfb]">
      {/* Header Skeleton */}
      <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-100 rounded-md animate-shimmer"></div>
            <div className="h-4 w-64 bg-gray-50 rounded-md animate-shimmer"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-gray-50 rounded-md animate-shimmer"></div>
          <div className="h-10 w-32 bg-gray-100 rounded-md animate-shimmer"></div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* List Header Skeleton */}
            <div className="grid grid-cols-[1fr_100px_140px_140px_140px] items-center border-b border-gray-100 bg-gray-50/50 py-3">
              <div className="pl-5"><div className="h-3 w-12 bg-gray-200 rounded animate-shimmer"></div></div>
              <div className="hidden md:block"><div className="h-3 w-16 bg-gray-200 rounded animate-shimmer"></div></div>
              <div className="hidden sm:block"><div className="h-3 w-12 bg-gray-200 rounded animate-shimmer"></div></div>
              <div className="hidden lg:block"><div className="h-3 w-20 bg-gray-200 rounded animate-shimmer ml-auto mr-5"></div></div>
              <div className="text-right pr-5 ml-auto"><div className="h-3 w-16 bg-gray-200 rounded animate-shimmer"></div></div>
            </div>

            {/* List Body Skeleton Slots */}
            <div className="divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_140px_140px_140px] items-center py-4">
                  <div className="flex items-center gap-3 pl-5">
                    <div className="w-4 h-4 bg-gray-100 rounded animate-shimmer"></div>
                    <div className="h-4 w-40 bg-gray-100 rounded animate-shimmer"></div>
                  </div>
                  <div className="hidden md:block">
                    <div className="h-6 w-16 bg-gray-50 rounded-full animate-shimmer"></div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-6 w-24 bg-gray-50 rounded-full animate-shimmer"></div>
                  </div>
                  <div className="hidden lg:block text-right pr-5 ml-auto">
                    <div className="h-4 w-20 bg-gray-50 rounded animate-shimmer"></div>
                  </div>
                  <div className="flex justify-end pr-5 ml-auto">
                    <div className="h-5 w-20 bg-gray-50 rounded-full animate-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
