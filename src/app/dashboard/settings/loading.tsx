import { Skeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton hasButton={false} />
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
