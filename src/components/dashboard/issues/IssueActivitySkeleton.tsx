import { Shimmer } from '@/components/ui/Skeleton';

export function IssueActivitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Shimmer className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-48 rounded-md" />
              <Shimmer className="h-4 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <div className="flex gap-3">
          <Shimmer className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

