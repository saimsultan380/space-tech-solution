import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";

interface DashboardPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const params = props.searchParams ? await props.searchParams : undefined;

  return (
    <DashboardWrapper
      searchParams={params ? { month: params.month } : undefined}
    />
  );
}
