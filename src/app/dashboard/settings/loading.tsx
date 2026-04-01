export default function SettingsLoading() {
  return (
    <div className="flex items-center justify-center p-12 w-full animate-pulse">
      <div className="bg-white rounded-[24px] shadow-sm w-full max-w-5xl flex overflow-hidden min-h-[640px] border border-gray-100/50">
        <div className="w-[280px] bg-gray-50/50 border-r border-gray-100 p-8">
          <div className="h-6 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-36 bg-gray-100 rounded mb-10" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        </div>
        <div className="flex-1 p-12">
          <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded mb-10" />
          <div className="h-20 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
