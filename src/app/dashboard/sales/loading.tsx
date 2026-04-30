import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function SalesLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
