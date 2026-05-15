'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load dashboard components with loading states
export const DashboardClient = dynamic(
  () => import('./dashboard-client').then(m => ({ default: m.DashboardClient })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false // Charts don't need SSR
  }
);

export const AgentDashboard = dynamic(
  () => import('./agent-dashboard').then(m => ({ default: m.AgentDashboard })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

export const ProcessorDashboard = dynamic(
  () => import('./processor-dashboard').then(m => ({ default: m.ProcessorDashboard })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

export const SalesPerformanceDashboard = dynamic(
  () => import('./sales-performance-dashboard').then(m => ({ default: m.SalesPerformanceDashboard })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
