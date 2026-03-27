import { requireRole } from "@/lib/auth";
import {
  getMarketingBudgetTransactions,
  getMarketingCampaignMonthlyTotals,
  getMarketingCampaigns,
  getMarketingDailyCallLogs,
  getMarketingDailyCampaignBudgets,
  getMarketingOverview,
  getMarketingUsers,
} from "@/lib/actions/marketing-budget";
import { MarketingBudgetClient } from "@/components/marketing-budget/marketing-budget-client";

interface MarketingBudgetPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function MarketingBudgetPage(props: MarketingBudgetPageProps) {
  await requireRole(["super_admin", "processor"]);
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const month = (searchParams?.month as string | undefined) || new Date().toISOString().slice(0, 7);

  const [overview, campaigns, users, dailyCallLogs, dailyCampaignBudgets, monthlyTotals, transactions] =
    await Promise.all([
      getMarketingOverview(month),
      getMarketingCampaigns(),
      getMarketingUsers(),
      getMarketingDailyCallLogs(),
      getMarketingDailyCampaignBudgets(month),
      getMarketingCampaignMonthlyTotals(month),
      getMarketingBudgetTransactions(),
    ]);

  return (
    <MarketingBudgetClient
      overview={overview}
      campaigns={campaigns}
      users={users}
      dailyCallLogs={dailyCallLogs}
      dailyCampaignBudgets={dailyCampaignBudgets}
      monthlyTotals={monthlyTotals}
      transactions={transactions}
      month={month}
    />
  );
}
