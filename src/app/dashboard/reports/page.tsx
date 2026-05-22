import { requireRole } from "@/lib/auth";
import { ReportsClient } from "@/components/reports/reports-client";

interface ReportsPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  await requireRole(["super_admin"]);
  const searchParams = props.searchParams
    ? await props.searchParams
    : undefined;

  const month =
    (searchParams?.month as string | undefined) ||
    new Date().toISOString().substring(0, 7);

  return <ReportsClient month={month} />;
}
