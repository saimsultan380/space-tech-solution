import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function SalesPerformanceLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton hasButton={false} />
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-card p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <Skeleton className="h-6 w-32" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
