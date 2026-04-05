import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * A more advanced Shimmer component that uses a sliding gradient
 * for a more premium "Linear-style" look.
 */
export function Shimmer({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-200/50",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}
