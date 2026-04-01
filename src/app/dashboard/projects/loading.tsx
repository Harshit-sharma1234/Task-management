export default function ProjectsLoading() {
  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfb] p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-white border border-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
