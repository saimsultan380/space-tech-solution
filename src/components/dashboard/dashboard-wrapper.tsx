"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DashboardClient,
  AgentDashboard,
  ProcessorDashboard,
  DashboardSkeleton,
} from "./dashboard-lazy";
import { Card, CardContent } from "@/components/ui/card";
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

export function DashboardWrapper({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      // Convert to AppUser type - fetch user metadata
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userData) {
        setUser(userData as AppUser);
      }
      setIsLoading(false);
    };

    getUser();
  }, [router]);

  // If no user or still loading auth, show skeleton
  if (isLoading || !user) {
    return <DashboardSkeleton />;
  }

  // Render appropriate dashboard based on user role
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

  // Admin dashboard
  return <AdminDashboardWrapper user={user} />;
}

function AdminDashboardWrapper({ user }: { user: AppUser }) {
  // Fetch dashboard stats
  const { data: stats = defaultStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: 30000,
  });

  // Fetch today's attendance
  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance"],
      queryFn: getTodayAttendance,
      staleTime: 30000,
    });

  // Fetch sales per agent
  const { data: salesPerAgent = [], isLoading: salesPerAgentLoading } =
    useQuery({
      queryKey: ["sales-per-agent"],
      queryFn: getSalesPerAgent,
      staleTime: 30000,
    });

  // Fetch revenue over time
  const { data: revenueData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue-over-time"],
    queryFn: () => getRevenueOverTime("day"),
    staleTime: 30000,
  });

  // Fetch recent payslips
  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips"],
    queryFn: () => getRecentPayslips(5),
    staleTime: 30000,
  });

  // Fetch attendance settings
  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: 30000,
  });

  // Fetch company settings
  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: 30000,
  });

  const isLoading =
    statsLoading ||
    attendanceLoading ||
    salesPerAgentLoading ||
    revenueLoading ||
    payslipsLoading ||
    settingsLoading ||
    companyLoading;

  if (isLoading) {
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
      attendanceSettings={attendanceSettings!}
      companySettings={companySettings!}
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
  // Fetch agent stats
  const { data: stats = defaultAgentStats, isLoading: statsLoading } = useQuery(
    {
      queryKey: ["agent-dashboard-stats", month],
      queryFn: () => getAgentDashboardStats(month),
      staleTime: 30000,
    },
  );

  // Fetch agent recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["agent-recent-sales", month],
    queryFn: () => getAgentRecentSales(month),
    staleTime: 30000,
  });

  // Fetch today's attendance
  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance"],
      queryFn: getTodayAttendance,
      staleTime: 30000,
    });

  // Fetch recent payslips
  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips"],
    queryFn: () => getRecentPayslips(5),
    staleTime: 30000,
  });

  // Fetch attendance settings
  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: 30000,
  });

  // Fetch company settings
  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: 30000,
  });

  const isLoading =
    statsLoading ||
    salesLoading ||
    attendanceLoading ||
    payslipsLoading ||
    settingsLoading ||
    companyLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <AgentDashboard
      user={user}
      stats={stats}
      recentSales={recentSales}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings!}
      companySettings={companySettings!}
      month={month}
    />
  );
}

function ProcessorDashboardWrapper({ user }: { user: AppUser }) {
  // Fetch processor stats
  const { data: stats = defaultProcStats, isLoading: statsLoading } = useQuery({
    queryKey: ["processor-dashboard-stats"],
    queryFn: getProcessorDashboardStats,
    staleTime: 30000,
  });

  // Fetch today's attendance
  const { data: todayAttendance = null, isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["today-attendance"],
      queryFn: getTodayAttendance,
      staleTime: 30000,
    });

  // Fetch recent payslips
  const { data: recentPayslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["recent-payslips"],
    queryFn: () => getRecentPayslips(5),
    staleTime: 30000,
  });

  // Fetch attendance settings
  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: 30000,
  });

  // Fetch company settings
  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: getCompanySettings,
    staleTime: 30000,
  });

  const isLoading =
    statsLoading ||
    attendanceLoading ||
    payslipsLoading ||
    settingsLoading ||
    companyLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ProcessorDashboard
      user={user}
      stats={stats}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings!}
      companySettings={companySettings!}
    />
  );
}
