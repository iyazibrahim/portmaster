import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}

export function SkeletonList({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3 max-w-[12rem]" />
            <Skeleton className="h-3 w-1/2 max-w-[9rem]" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
