import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

// Reusable page-level skeleton layouts
function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 border-b flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <div className="divide-y">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            {[...Array(cols)].map((_, j) => (
              <Skeleton key={j} className={cn("h-4", j === 0 ? "w-8" : j === 1 ? "flex-1" : "w-24")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count === 4 ? "md:grid-cols-2 lg:grid-cols-4" : count === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function PageHeaderSkeleton({ hasButton = true }: { hasButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {hasButton && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

export { Skeleton, TableSkeleton, StatCardsSkeleton, PageHeaderSkeleton };
