import { getProcessingAccounts, getProcessingAccountStats } from "@/lib/actions/processing-accounts";
import { requireAuth } from "@/lib/auth";
import { canAccessProcessingAccounts } from "@/lib/nav-access";
import { ProcessingAccountsClient } from "@/components/processing-accounts/processing-accounts-client";
import { redirect } from "next/navigation";
import type { ProcessingAccountStatus } from "@/lib/types";

export default async function ProcessingAccountsPage(props: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; from_date?: string; to_date?: string; account_type?: string }>;
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
  const account_type = searchParams.account_type || "all";

  const [accountsResponse, stats] = await Promise.all([
    getProcessingAccounts({
      page,
      pageSize: 10,
      search,
      status,
      from_date,
      to_date,
      account_type,
    }),
    getProcessingAccountStats({ search, from_date, to_date, account_type }),
  ]);

  const formattedAccounts = {
    ...accountsResponse,
    data: accountsResponse.data.map((row) => ({
      id: row.id,
      account_type: row.account_type,
      account_holder_name: row.account_holder_name ?? "",
      routing_number: row.routing_number,
      account_number: row.account_number,
      card_number: row.card_number,
      expiration_date: row.expiration_date,
      cvv: row.cvv,
      billing_address: row.billing_address ?? "",
      status: row.status,
      notes: row.notes,
      created_at: String(row.created_at || ""),
    })),
  };

  return (
    <ProcessingAccountsClient
      accountsResponse={formattedAccounts}
      stats={stats}
      userRole={user.role}
    />
  );
}
