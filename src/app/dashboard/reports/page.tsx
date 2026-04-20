import { requireRole } from "@/lib/auth";
import {
  getSalesPerAgent,
  getSalesPerProcessor,
  getRevenueOverTime,
  getChargebacksPerEmployee,
  getAttendanceVsPerformance,
  getDashboardStats,
  getEmployeeMonthlyStats,
} from "@/lib/actions/analytics";
import { ReportsClient } from "@/components/reports/reports-client";

interface ReportsPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  await requireRole(["super_admin"]);
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  const month = (searchParams?.month as string | undefined) || new Date().toISOString().substring(0, 7);

  const [
    stats,
    salesPerAgent,
    salesPerProcessor,
    revenueDaily,
    revenueWeekly,
    revenueMonthly,
    chargebacksPerEmployee,
    attendanceVsPerformance,
    employeeMonthlyStats,
  ] = await Promise.all([
    getDashboardStats(month),
    getSalesPerAgent(month),
    getSalesPerProcessor(month),
    getRevenueOverTime("day"),
    getRevenueOverTime("week"),
    getRevenueOverTime("month"),
    getChargebacksPerEmployee(month),
    getAttendanceVsPerformance(month),
    getEmployeeMonthlyStats(month),
  ]);

  return (
    <ReportsClient
      stats={stats}
      salesPerAgent={salesPerAgent}
      salesPerProcessor={salesPerProcessor}
      revenueData={{ daily: revenueDaily, weekly: revenueWeekly, monthly: revenueMonthly }}
      chargebacksPerEmployee={chargebacksPerEmployee}
      attendanceVsPerformance={attendanceVsPerformance}
      employeeMonthlyStats={employeeMonthlyStats}
      month={month}
    />
  );
}
