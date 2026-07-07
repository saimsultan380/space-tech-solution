import { requireAuth } from "@/lib/auth";
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";

interface DashboardPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  // requireAuth() is React-cached — re-calling it here costs nothing extra
  // because the layout already called it. The user is available immediately.
  const [user, params] = await Promise.all([
    requireAuth(),
    props.searchParams ? props.searchParams : Promise.resolve(undefined),
  ]);

  return (
    <DashboardWrapper
      user={user}
      searchParams={params ? { month: params.month } : undefined}
    />
  );
}
