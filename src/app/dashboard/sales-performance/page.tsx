import { requireAuth } from "@/lib/auth";
import {
  getAgentPerformanceStats,
  getAgentMonthlySalesTrends,
  getAgentDealCategories,
  getAgentRevenueOverTime,
  getSalesLeaderboard,
  getRecentSalesNotifications,
} from "@/lib/actions/sales-performance";
import { SalesPerformanceDashboard } from "@/components/dashboard/sales-performance-dashboard";

export default async function SalesPerformancePage() {
  const user = await requireAuth();

  const [stats, monthlyTrends, dealCategories, revenueTimeline, leaderboard, notifications] =
    await Promise.all([
      getAgentPerformanceStats(),
      getAgentMonthlySalesTrends(),
      getAgentDealCategories(),
      getAgentRevenueOverTime(),
      getSalesLeaderboard(),
      getRecentSalesNotifications(),
    ]);

  return (
    <SalesPerformanceDashboard
      currentUserId={user.id}
      currentUserName={user.full_name}
      stats={stats}
      monthlyTrends={monthlyTrends}
      dealCategories={dealCategories}
      revenueTimeline={revenueTimeline}
      leaderboard={leaderboard}
      notifications={notifications}
    />
  );
}
