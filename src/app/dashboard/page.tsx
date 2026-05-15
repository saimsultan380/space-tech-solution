import { requireAuth } from "@/lib/auth";
import {
  getDashboardStats,
  getSalesPerAgent,
  getRevenueOverTime,
  getAgentDashboardStats,
  getAgentRecentSales,
  getProcessorDashboardStats,
} from "@/lib/actions/analytics";
import { getTodayAttendance } from "@/lib/actions/attendance";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import { getRecentPayslips } from "@/lib/actions/payslips";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { DashboardClient, AgentDashboard, ProcessorDashboard } from "@/components/dashboard/dashboard-lazy";
import type { Payslip } from "@/lib/types";

const defaultStats = {
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

interface DashboardPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const user = await requireAuth();

  if (user.role === "sales_agent") {
    return <AgentDashboardPage user={user} searchParams={props.searchParams} />;
  }

  if (user.role === "processor") {
    return <ProcessorDashboardPage user={user} />;
  }

  let stats = defaultStats;
  let todayAttendance = null;
  let salesPerAgent: Array<{ name: string; total: number; approved: number; revenue: number }> = [];
  let revenueData: Array<{ date: string; revenue: number }> = [];
  let recentPayslips: Payslip[] = [];
  let attendanceSettings;
  let companySettings;

  try {
    [stats, todayAttendance, salesPerAgent, revenueData, recentPayslips, attendanceSettings, companySettings] = await Promise.all([
      getDashboardStats(),
      getTodayAttendance(),
      getSalesPerAgent(),
      getRevenueOverTime("day"),
      getRecentPayslips(5),
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
  } catch {
    [attendanceSettings, companySettings] = await Promise.all([
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
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

async function AgentDashboardPage({ user, searchParams }: { user: Awaited<ReturnType<typeof requireAuth>>; searchParams?: Promise<{ month?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const month = (params?.month as string | undefined) || new Date().toISOString().substring(0, 7);

  const defaultAgentStats = {
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

  let agentStats = defaultAgentStats;
  let recentSales: Array<{
    id: string;
    company_name: string;
    charged_amount: number;
    created_at: string;
    customer_name: string;
  }> = [];
  let todayAttendance = null;
  let recentPayslips: Payslip[] = [];
  let attendanceSettings;
  let companySettings;

  try {
    [agentStats, recentSales, todayAttendance, recentPayslips, attendanceSettings, companySettings] = await Promise.all([
      getAgentDashboardStats(month),
      getAgentRecentSales(month),
      getTodayAttendance(),
      getRecentPayslips(5),
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
  } catch {
    [attendanceSettings, companySettings] = await Promise.all([
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
  }

  return (
    <AgentDashboard
      user={user}
      stats={agentStats}
      recentSales={recentSales}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings!}
      companySettings={companySettings!}
      month={month}
    />
  );
}

async function ProcessorDashboardPage({ user }: { user: Awaited<ReturnType<typeof requireAuth>> }) {
  const defaultProcStats = {
    totalSales: 0,
    salesThisWeek: 0,
    weekRecordedRevenue: 0,
  };

  let procStats = defaultProcStats;
  let todayAttendance = null;
  let recentPayslips: Payslip[] = [];
  let attendanceSettings;
  let companySettings;

  try {
    [procStats, todayAttendance, recentPayslips, attendanceSettings, companySettings] = await Promise.all([
      getProcessorDashboardStats(),
      getTodayAttendance(),
      getRecentPayslips(5),
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
  } catch {
    [attendanceSettings, companySettings] = await Promise.all([
      getAttendanceSettings(),
      getCompanySettings(),
    ]);
  }

  return (
    <ProcessorDashboard
      user={user}
      stats={procStats}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings!}
      companySettings={companySettings!}
    />
  );
}
