import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton hasButton={false} />
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
