import { requireAuth } from "@/lib/auth";
import {
  getAgentPerformanceStats,
  getAgentMonthlySalesTrends,
  getAgentDealCategories,
  getAgentRevenueOverTime,
  getSalesLeaderboard,
  getRecentSalesNotifications,
} from "@/lib/actions/sales-performance";
import { SalesPerformanceDashboard } from "@/components/dashboard/dashboard-lazy";

export default async function SalesPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireAuth();
  const { month: rawMonth } = await searchParams;

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = /^\d{4}-\d{2}$/.test(rawMonth ?? "") ? rawMonth! : currentMonth;

  const [stats, monthlyTrends, dealCategories, revenueTimeline, leaderboard, notifications] =
    await Promise.all([
      getAgentPerformanceStats(undefined, selectedMonth),
      getAgentMonthlySalesTrends(),
      getAgentDealCategories(undefined, selectedMonth),
      getAgentRevenueOverTime(),
      getSalesLeaderboard(),
      getRecentSalesNotifications(),
    ]);

  return (
    <SalesPerformanceDashboard
      currentUserId={user.id}
      selectedMonth={selectedMonth}
      stats={stats}
      monthlyTrends={monthlyTrends}
      dealCategories={dealCategories}
      revenueTimeline={revenueTimeline}
      leaderboard={leaderboard}
      notifications={notifications}
    />
  );
}
