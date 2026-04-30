import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function MarketingBudgetLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    </div>
  );
}
