import { cn } from "@/lib/utils";

export function WidgetSkeleton({ className, rows = 3 }: { className?: string; rows?: number }) {
    return (
        <div className={cn("bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4 animate-pulse", className)}>
            <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-8 bg-gray-50 rounded" />
            </div>
            <div className="space-y-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="h-8 w-8 bg-gray-50 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                                <div className="h-2 w-1/4 bg-gray-50 rounded" />
                            </div>
                        </div>
                        <div className="h-3 w-12 bg-gray-50 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm animate-pulse flex items-center justify-between">
                    <div className="space-y-3">
                        <div className="h-3 w-16 bg-gray-100 rounded" />
                        <div className="h-8 w-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-10 w-10 bg-gray-50 rounded-lg" />
                </div>
            ))}
        </div>
    );
}
