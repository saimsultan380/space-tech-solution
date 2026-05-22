import {
  Skeleton,
  StatCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton hasButton={false} />
      <StatCardsSkeleton count={8} />

      {/* Employee Table Skeleton */}
      <div className="rounded-lg border border-zinc-200 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 bg-card p-5 space-y-4"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
