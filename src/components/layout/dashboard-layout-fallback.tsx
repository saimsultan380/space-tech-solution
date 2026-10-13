import { Skeleton } from "@/components/ui/skeleton";

/** Shown while dashboard layout resolves auth + profile (does not block public routes). */
export function DashboardLayoutFallback() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-muted/30 p-4 lg:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Skeleton className="h-14 w-full shrink-0 rounded-none" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 xl:p-6">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
