'use client';

export function SettingsSkeleton() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full animate-pulse">
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {/* Tabs Header Skeleton */}
        <div className="border-b border-gray-100 px-6 py-4 flex gap-8">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-100 rounded"></div>
            <div className="h-4 w-24 bg-gray-100 rounded"></div>
        </div>

        {/* Form Content Skeleton */}
        <div className="p-10 flex flex-col gap-10">
            <div className="flex items-center gap-6 pb-8 border-b border-gray-50">
                <div className="h-20 w-20 rounded-full bg-gray-200"></div>
                <div className="flex flex-col gap-2">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-48 bg-gray-100 rounded"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg"></div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg"></div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="h-4 w-24 bg-gray-100 rounded"></div>
                <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg"></div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <div className="h-10 w-24 bg-gray-100 rounded-lg"></div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
      </div>
    </div>
  );
}
