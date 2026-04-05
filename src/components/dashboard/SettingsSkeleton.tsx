import { Shimmer } from "@/components/ui/Skeleton";

export function SettingsSkeleton() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col items-start w-full min-h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex flex-col gap-2 mb-8">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <Shimmer className="h-4 w-96 rounded-md opacity-60" />
      </div>

      <div className="w-full space-y-12">
        {/* Profile Section */}
        <section className="flex flex-col md:flex-row gap-10 border-b border-gray-100 pb-12">
          <div className="md:w-1/3 space-y-2">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-4 w-4/5 opacity-60" />
          </div>
          <div className="flex-1 space-y-8 max-w-xl">
            <div className="flex items-center gap-6">
              <Shimmer className="h-24 w-24 rounded-full border-2 border-white shadow-sm" />
              <div className="space-y-2">
                <Shimmer className="h-9 w-32 rounded-lg" />
                <Shimmer className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Shimmer className="h-4 w-12" />
                <Shimmer className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Shimmer className="h-4 w-12" />
                <Shimmer className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="flex flex-col md:flex-row gap-10 border-b border-gray-100 pb-12">
          <div className="md:w-1/3 space-y-2">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-4 w-4/5 opacity-60" />
          </div>
          <div className="flex-1 space-y-6 max-w-xl">
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
        </section>

        <div className="flex justify-end pt-6">
           <Shimmer className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
