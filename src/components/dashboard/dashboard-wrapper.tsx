"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DashboardClient,
  AgentDashboard,
  ProcessorDashboard,
  DashboardSkeleton,
} from "./dashboard-lazy";
import type { AppUser, Payslip, AttendanceSettings } from "@/lib/types";
import type { CompanySettings } from "@/lib/actions/company-settings";
import {
  getDashboardStats,
  getSalesPerAgent,
  getRevenueOverTime,
  getAgentDashboardStats,
  getAgentRecentSales,
  getProcessorDashboardStats,
  getTodayAttendance,
  getRecentPayslips,
  getAttendanceSettings,
  getCompanySettings,
  type DashboardStats,
  type SalesPerAgentData,
  type RevenueData,
  type AgentDashboardStats,
  type AttendanceRecord,
} from "@/lib/queries/analytics";

// Settings that rarely change — cache for 5 minutes on the client.
const SETTINGS_STALE_MS = 5 * 60 * 1000;
// Dashboard stats — refresh every 60 seconds.
const STATS_STALE_MS = 60 * 1000;

const defaultStats: DashboardStats = {
  totalSales: 0,
  totalRevenue: 0,
  totalCustomers: 0,
  pendingSales: 0,
  approvedSales: 0,
  rejectedSales: 0,
  totalChargebacks: 0,
  openChargebacks: 0,
  pendingLeaves: 0,
  todayOnLeave: 0,
  conversionRate: "0",
};

const defaultAgentStats: AgentDashboardStats = {
  totalSales: 0,
  todaySales: 0,
  todayRevenue: 0,
  monthSales: 0,
  monthRevenue: 0,
  pendingSales: 0,
  approvedSales: 0,
  rejectedSales: 0,
  totalRevenue: 0,
  totalCustomers: 0,
};

const defaultProcStats = {
  totalSales: 0,
  salesThisWeek: 0,
  weekRecordedRevenue: 0,
};

// User is resolved server-side in dashboard/page.tsx — no client-side auth
// round-trip needed here.
export function DashboardWrapper({
  user,
  searchParams,
}: {
  user: AppUser;
  searchParams?: { month?: string };
}) {
  if (user.role === "sales_agent") {
    return (
      <AgentDashboardWrapper
        user={user}
        month={searchParams?.month || new Date().toISOString().substring(0, 7)}
      />
    );
  }

  if (user.role === "processor") {
    return <ProcessorDashboardWrapper user={user} />;
  }

  return <AdminDashboardWrapper user={user} />;
}

function AdminDashboardWrapper({ user }: { user: AppUser }) {
  const { data: stats = defaultStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: STATS_STALE_MS,
  });

  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance", user.id],
      queryFn: () => getTodayAttendance(user.id),
      staleTime: STATS_STALE_MS,
    });

  const { data: salesPerAgent = [], isLoading: salesPerAgentLoading } =
    useQuery({
      queryKey: ["sales-per-agent"],
      queryFn: getSalesPerAgent,
      staleTime: STATS_STALE_MS,
    });

  const { data: revenueData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue-over-time"],
    queryFn: () => getRevenueOverTime("day"),
    staleTime: STATS_STALE_MS,
  });

  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips", user.id],
    queryFn: () => getRecentPayslips(5, user.id),
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: SETTINGS_STALE_MS,
  });

  // Paint as soon as primary stats are ready — charts/payslips/settings fill in after.
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardClient
      user={user}
      stats={stats}
      todayAttendance={todayAttendance}
      salesPerAgent={salesPerAgent}
      revenueData={revenueData}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings}
      companySettings={companySettings}
      secondaryLoading={
        attendanceLoading ||
        salesPerAgentLoading ||
        revenueLoading ||
        payslipsLoading ||
        settingsLoading ||
        companyLoading
      }
    />
  );
}

function AgentDashboardWrapper({
  user,
  month,
}: {
  user: AppUser;
  month: string;
}) {
  const { data: stats = defaultAgentStats, isLoading: statsLoading } = useQuery(
    {
      queryKey: ["agent-dashboard-stats", month, user.id],
      queryFn: () => getAgentDashboardStats(month, user.id),
      staleTime: STATS_STALE_MS,
    },
  );

  const { data: recentSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["agent-recent-sales", month, user.id],
    queryFn: () => getAgentRecentSales(month, user.id),
    staleTime: STATS_STALE_MS,
  });

  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance", user.id],
      queryFn: () => getTodayAttendance(user.id),
      staleTime: STATS_STALE_MS,
    });

  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips", user.id],
    queryFn: () => getRecentPayslips(5, user.id),
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: SETTINGS_STALE_MS,
  });

  // Show skeleton only until the primary stats are ready — secondary data
  // (payslips, settings) renders progressively once the above resolves.
  if (statsLoading || salesLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <AgentDashboard
      user={user}
      stats={stats}
      recentSales={recentSales}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings ?? undefined}
      companySettings={companySettings ?? undefined}
      month={month}
      secondaryLoading={attendanceLoading || payslipsLoading || settingsLoading || companyLoading}
    />
  );
}

function ProcessorDashboardWrapper({ user }: { user: AppUser }) {
  const { data: stats = defaultProcStats, isLoading: statsLoading } = useQuery({
    queryKey: ["processor-dashboard-stats"],
    queryFn: getProcessorDashboardStats,
    staleTime: STATS_STALE_MS,
  });

  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance", user.id],
      queryFn: () => getTodayAttendance(user.id),
      staleTime: STATS_STALE_MS,
    });

  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips", user.id],
    queryFn: () => getRecentPayslips(5, user.id),
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: SETTINGS_STALE_MS,
  });

  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: SETTINGS_STALE_MS,
  });

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ProcessorDashboard
      user={user}
      stats={stats}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings ?? undefined}
      companySettings={companySettings ?? undefined}
      secondaryLoading={attendanceLoading || payslipsLoading || settingsLoading || companyLoading}
    />
  );
}
