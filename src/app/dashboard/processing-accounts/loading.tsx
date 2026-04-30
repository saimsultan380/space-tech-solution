import { Skeleton, StatCardsSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function ProcessingAccountsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
