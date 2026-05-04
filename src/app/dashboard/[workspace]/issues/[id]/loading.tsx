/**
 * Route-level loading state for the Issue Detail page.
 * Renders an instant skeleton matching the issue detail layout
 * so the user sees immediate feedback while server data loads.
 */
export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-white animate-pulse">
      {/* Breadcrumb bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-4 w-12 bg-gray-100 rounded" />
          <div className="h-3 w-3 bg-gray-100 rounded" />
          <div className="h-4 w-20 bg-gray-100 rounded" />
        </div>
        <div className="h-8 w-20 bg-gray-100 rounded-md" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 p-10 max-w-4xl border-r border-gray-100">
          {/* Title */}
          <div className="h-8 w-3/4 bg-gray-100 rounded mb-4" />
          {/* Description lines */}
          <div className="space-y-3 mt-6">
            <div className="h-4 w-full bg-gray-50 rounded" />
            <div className="h-4 w-5/6 bg-gray-50 rounded" />
            <div className="h-4 w-4/6 bg-gray-50 rounded" />
            <div className="h-4 w-3/4 bg-gray-50 rounded" />
          </div>

          {/* Activity section */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="h-4 w-16 bg-gray-100 rounded mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-gray-50 rounded" />
                    <div className="h-4 w-3/4 bg-gray-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 bg-white p-6 border-l border-gray-100">
          <div className="space-y-6">
            {['Status', 'Priority', 'Assignee', 'Reviewer'].map(label => (
              <div key={label} className="space-y-2">
                <div className="h-3 w-16 bg-gray-100 rounded" />
                <div className="h-8 w-full bg-gray-50 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
