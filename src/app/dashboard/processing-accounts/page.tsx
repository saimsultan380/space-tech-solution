import { getProcessingAccounts, getProcessingAccountStats } from "@/lib/actions/processing-accounts";
import { requireAuth } from "@/lib/auth";
import { canAccessProcessingAccounts } from "@/lib/nav-access";
import { ProcessingAccountsClient } from "@/components/processing-accounts/processing-accounts-client";
import { redirect } from "next/navigation";
import type { ProcessingAccountStatus } from "@/lib/types";

export default async function ProcessingAccountsPage(props: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; date?: string }>;
}) {
  const user = await requireAuth();
  if (!canAccessProcessingAccounts(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const status = (searchParams.status || "all") as ProcessingAccountStatus | "all";
  const date = searchParams.date || "";

  const [accountsResponse, stats] = await Promise.all([
    getProcessingAccounts({
      page,
      pageSize: 10,
      search,
      status,
      date,
    }),
    getProcessingAccountStats(),
  ]);

  return (
    <ProcessingAccountsClient
      accountsResponse={accountsResponse}
      stats={stats}
      userRole={user.role}
    />
  );
}
