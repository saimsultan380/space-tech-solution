import { requireRole } from "@/lib/auth";
import {
  getMarketingEntriesPage,
  getMarketingEntryStats,
  getMarketingEntryChartData,
} from "@/lib/actions/marketing-budget";
import { MarketingBudgetClient } from "@/components/marketing-budget/marketing-budget-client";
import type { MarketingEntryCampaign } from "@/lib/types";

const ENTRIES_PAGE_SIZE = 10;

interface MarketingBudgetPageProps {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    campaign?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function MarketingBudgetPage(props: MarketingBudgetPageProps) {
  await requireRole(["super_admin", "processor"]);
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  const filters = {
    startDate: searchParams?.from || "",
    endDate: searchParams?.to || "",
    campaign: (searchParams?.campaign || "all") as MarketingEntryCampaign | "all",
  };

  const q = searchParams?.q?.trim() || "";
  const page = Math.max(1, Number.parseInt(searchParams?.page || "1", 10) || 1);

  const [entriesResponse, stats, chartData] = await Promise.all([
    getMarketingEntriesPage({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      campaign: filters.campaign,
      search: q || undefined,
      page,
      pageSize: ENTRIES_PAGE_SIZE,
    }),
    getMarketingEntryStats({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      campaign: filters.campaign,
    }),
    getMarketingEntryChartData({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      campaign: filters.campaign,
    }),
  ]);

  return (
    <MarketingBudgetClient
      entriesResponse={entriesResponse}
      stats={stats}
      chartData={chartData}
      filters={{
        startDate: filters.startDate,
        endDate: filters.endDate,
        campaign: filters.campaign,
      }}
    />
  );
}
