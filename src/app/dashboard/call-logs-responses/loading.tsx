import { Skeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function CallLogsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
