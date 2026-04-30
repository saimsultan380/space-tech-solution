import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32 ml-auto" />
        </div>
        <Skeleton className="h-10 w-full" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
