import { requireAuth } from "@/lib/auth";
import {
  getDashboardStats,
  getSalesPerAgent,
  getRevenueOverTime,
  getAgentDashboardStats,
  getAgentRecentSales,
  getProcessorDashboardStats,
  getPendingSalesQueue,
} from "@/lib/actions/analytics";
import { getTodayAttendance } from "@/lib/actions/attendance";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import { getRecentPayslips } from "@/lib/actions/payslips";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { ProcessorDashboard } from "@/components/dashboard/processor-dashboard";
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

export default async function DashboardPage() {
  const user = await requireAuth();

  if (user.role === "sales_agent") {
    return <AgentDashboardPage />;
  }

  if (user.role === "processor") {
    return <ProcessorDashboardPage />;
  }

  let stats = defaultStats;
  let todayAttendance = null;
  let salesPerAgent: Array<{ name: string; total: number; approved: number; revenue: number }> = [];
  let revenueData: Array<{ date: string; revenue: number }> = [];
  let recentPayslips: Payslip[] = [];
  let attendanceSettings = await getAttendanceSettings();
  let companySettings = await getCompanySettings();

  try {
    [stats, todayAttendance, salesPerAgent, revenueData, recentPayslips, attendanceSettings] = await Promise.all([
      getDashboardStats(),
      getTodayAttendance(),
      getSalesPerAgent(),
      getRevenueOverTime("day"),
      getRecentPayslips(5),
      getAttendanceSettings(),
    ]);
  } catch {
    // Tables may not exist yet
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
    />
  );
}

async function AgentDashboardPage() {
  const user = await requireAuth();

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
    status: string;
    created_at: string;
    customer_name: string;
  }> = [];
  let todayAttendance = null;
  let recentPayslips: Payslip[] = [];
  let attendanceSettings = await getAttendanceSettings();
  let companySettings = await getCompanySettings();

  try {
    [agentStats, recentSales, todayAttendance, recentPayslips, attendanceSettings] = await Promise.all([
      getAgentDashboardStats(),
      getAgentRecentSales(),
      getTodayAttendance(),
      getRecentPayslips(5),
      getAttendanceSettings(),
    ]);
  } catch {
    // Tables may not exist yet
  }

  return (
    <AgentDashboard
      user={user}
      stats={agentStats}
      recentSales={recentSales}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings}
      companySettings={companySettings}
    />
  );
}

async function ProcessorDashboardPage() {
  const user = await requireAuth();

  const defaultProcStats = {
    pendingQueue: 0,
    totalProcessed: 0,
    todayProcessed: 0,
    approvedByMe: 0,
    rejectedByMe: 0,
    todayApproved: 0,
    todayRejected: 0,
    processedRevenue: 0,
  };

  let procStats = defaultProcStats;
  let pendingSales: Array<{
    id: string;
    sale_type: string;
    subtype: string;
    company_name: string;
    charged_amount: number;
    sales_notes: string;
    created_at: string;
    customer_name: string;
    customer_email: string;
    agent_name: string;
  }> = [];
  let todayAttendance = null;
  let recentPayslips: Payslip[] = [];
  let attendanceSettings = await getAttendanceSettings();
  let companySettings = await getCompanySettings();

  try {
    [procStats, pendingSales, todayAttendance, recentPayslips, attendanceSettings] = await Promise.all([
      getProcessorDashboardStats(),
      getPendingSalesQueue(),
      getTodayAttendance(),
      getRecentPayslips(5),
      getAttendanceSettings(),
    ]);
  } catch {
    // Tables may not exist yet
  }

  return (
    <ProcessorDashboard
      user={user}
      stats={procStats}
      pendingSales={pendingSales}
      todayAttendance={todayAttendance}
      recentPayslips={recentPayslips}
      attendanceSettings={attendanceSettings}
      companySettings={companySettings}
    />
  );
}
