import { Skeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function NotepadLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton hasButton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
