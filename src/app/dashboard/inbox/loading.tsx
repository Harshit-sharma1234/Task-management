export default function InboxLoading() {
  return (
    <div className="flex h-full bg-[#fbfbfb] animate-pulse">
      {/* Left panel skeleton */}
      <div className="w-[380px] border-r border-gray-100 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-16 bg-gray-200 rounded mb-2" />
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-gray-100 rounded-md" />
            <div className="h-7 w-16 bg-gray-100 rounded-md" />
          </div>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-full bg-gray-200 rounded mb-1.5" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Right panel skeleton */}
      <div className="flex-1 p-8">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-full bg-gray-100 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
