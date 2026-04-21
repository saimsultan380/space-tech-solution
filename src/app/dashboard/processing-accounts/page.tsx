import { getProcessingAccounts, getProcessingAccountStats } from "@/lib/actions/processing-accounts";
import { requireAuth } from "@/lib/auth";
import { canAccessProcessingAccounts } from "@/lib/nav-access";
import { ProcessingAccountsClient } from "@/components/processing-accounts/processing-accounts-client";
import { redirect } from "next/navigation";
import type { ProcessingAccountStatus } from "@/lib/types";

export default async function ProcessingAccountsPage(props: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; from_date?: string; to_date?: string }>;
}) {
  const user = await requireAuth();
  if (!canAccessProcessingAccounts(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const status = (searchParams.status || "all") as ProcessingAccountStatus | "all";
  const from_date = searchParams.from_date || "";
  const to_date = searchParams.to_date || "";

  const [accountsResponse, stats] = await Promise.all([
    getProcessingAccounts({
      page,
      pageSize: 10,
      search,
      status,
      from_date,
      to_date,
    }),
    getProcessingAccountStats({ search, from_date, to_date }),
  ]);

  return (
    <ProcessingAccountsClient
      accountsResponse={accountsResponse}
      stats={stats}
      userRole={user.role}
    />
  );
}
