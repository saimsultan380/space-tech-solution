"use client";

import { useState } from "react";
import { AttendanceWidget } from "./attendance-widget";
import { RevenueChart } from "@/components/reports/charts/revenue-chart";
import { SalesPerAgentChart } from "@/components/reports/charts/sales-per-agent-chart";
import { ConversionChart } from "@/components/reports/charts/conversion-chart";
import { PayslipDashboardCard } from "@/components/payslips/payslip-dashboard-card";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { AppUser, Payslip } from "@/lib/types";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Eye,
  EyeOff,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

interface DashboardClientProps {
  user: AppUser;
  stats: {
    totalSales: number;
    totalRevenue: number;
    totalCustomers: number;
    pendingSales: number;
    approvedSales: number;
    rejectedSales: number;
    totalChargebacks: number;
    openChargebacks: number;
    conversionRate: string;
    pendingLeaves: number;
    todayOnLeave: number;
  };
  todayAttendance: {
    id: string;
    check_in: string;
    check_out: string | null;
  } | null;
  salesPerAgent: Array<{ name: string; total: number; approved: number; revenue: number }>;
  revenueData: Array<{ date: string; revenue: number }>;
  recentPayslips: Payslip[];
  attendanceSettings: {
    shift_start_12h: string;
    shift_end_12h: string;
  };
}

export function DashboardClient({
  user,
  stats,
  todayAttendance,
  salesPerAgent,
  revenueData,
  recentPayslips,
  attendanceSettings,
}: DashboardClientProps) {
  const [showCharts, setShowCharts] = useState(true);
  const { currency } = useCurrency();
  const revenueTrend = getRevenueTrend(revenueData);
  const conversionValue = Number(stats.conversionRate || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6B7280]">Good {getGreeting()}</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#111827]">
            Welcome back, {user.full_name}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#9CA3AF]">
            Here&apos;s an overview of your business today.
          </p>
        </div>
        <button
          onClick={() => setShowCharts((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
        >
          {showCharts ? (
            <><EyeOff className="h-4 w-4" /> Hide Charts</>
          ) : (
            <><Eye className="h-4 w-4" /> Show Charts</>
          )}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue, currency)}
          description="From approved sales"
          trend={revenueTrend}
          Icon={DollarSign}
          iconBgClass="bg-[#EFF6FF]"
          iconTextClass="text-[#3B6EF8]"
        />
        <MetricCard
          title="Total Sales"
          value={stats.totalSales}
          description={`${stats.pendingSales} pending`}
          trend={Math.round(((stats.approvedSales - stats.pendingSales) / Math.max(stats.totalSales, 1)) * 100)}
          Icon={ShoppingCart}
          iconBgClass="bg-[#F0FDF4]"
          iconTextClass="text-[#16A34A]"
        />
        <MetricCard
          title="Call Logs Responses"
          value={stats.totalCustomers}
          trend={Math.max(1, Math.round((stats.totalCustomers / Math.max(stats.totalSales, 1)) * 10))}
          Icon={Users}
          iconBgClass="bg-[#EEF3FF]"
          iconTextClass="text-[#3B6EF8]"
          description="In your database"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          trend={conversionValue >= 50 ? 3 : -3}
          Icon={TrendingUp}
          iconBgClass="bg-[#F0FDF4]"
          iconTextClass="text-[#16A34A]"
          description={`${stats.approvedSales} approved of ${stats.totalSales}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <MetricCard
          title="Pending Sales"
          value={stats.pendingSales}
          trend={Math.max(1, Math.round((stats.pendingSales / Math.max(stats.totalSales, 1)) * 100))}
          Icon={Clock}
          iconBgClass="bg-[#FFFBEB]"
          iconTextClass="text-[#F59E0B]"
          valueClassName="text-[#F59E0B]"
          description="Awaiting processing"
        />
        <MetricCard
          title="Open Chargebacks"
          value={stats.openChargebacks}
          trend={-Math.max(1, Math.round((stats.openChargebacks / Math.max(stats.totalChargebacks, 1)) * 100))}
          Icon={AlertTriangle}
          iconBgClass="bg-[#FEF2F2]"
          iconTextClass="text-[#EF4444]"
          valueClassName="text-[#EF4444]"
          description={`${stats.totalChargebacks} total chargebacks`}
        />
        <MetricCard
          title="Pending Leave Requests"
          value={stats.pendingLeaves}
          trend={-Math.max(1, Math.round((stats.pendingLeaves / Math.max(stats.todayOnLeave + stats.pendingLeaves, 1)) * 100))}
          Icon={CalendarDays}
          iconBgClass="bg-[#FFFBEB]"
          iconTextClass="text-[#F59E0B]"
          valueClassName="text-[#F59E0B]"
          description={`${stats.todayOnLeave} employees on leave today`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <AttendanceWidget todayAttendance={todayAttendance} attendanceSettings={attendanceSettings} />
        </div>
      </div>

      <PayslipDashboardCard payslips={recentPayslips} title="Latest Payslips" />

      {showCharts && (
        <div className="animate-[slide-up_0.3s_ease-out] space-y-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF3FF]">
              <BarChart3 className="h-4 w-4 text-[#3B6EF8]" />
            </div>
            <h2 className="text-lg font-semibold text-[#111827]">Analytics Overview</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Revenue Trend</h3>
                  <p className="text-xs font-medium text-[#9CA3AF]">Daily revenue from approved sales</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3FF]">
                  <DollarSign className="h-4 w-4 text-[#3B6EF8]" />
                </div>
              </div>
              <RevenueChart data={revenueData} />
            </div>

            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Sales Conversion</h3>
                  <p className="text-xs font-medium text-[#9CA3AF]">Approved vs pending vs rejected</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3FF]">
                  <TrendingUp className="h-4 w-4 text-[#3B6EF8]" />
                </div>
              </div>
              <ConversionChart
                approved={stats.approvedSales}
                pending={stats.pendingSales}
                rejected={stats.rejectedSales}
              />
            </div>

            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Sales per Agent</h3>
                  <p className="text-xs font-medium text-[#9CA3AF]">Performance breakdown by agent</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3FF]">
                  <Users className="h-4 w-4 text-[#3B6EF8]" />
                </div>
              </div>
              <SalesPerAgentChart data={salesPerAgent} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getRevenueTrend(data: Array<{ date: string; revenue: number }>) {
  if (data.length < 2) return 0;
  const latest = Number(data[data.length - 1]?.revenue || 0);
  const previous = Number(data[data.length - 2]?.revenue || 0);
  if (previous === 0) return latest > 0 ? 100 : 0;
  return Math.round(((latest - previous) / previous) * 100);
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  trend: number;
  Icon: LucideIcon;
  iconBgClass: string;
  iconTextClass: string;
  valueClassName?: string;
}

function MetricCard({
  title,
  value,
  description,
  trend,
  Icon,
  iconBgClass,
  iconTextClass,
  valueClassName,
}: MetricCardProps) {
  const trendPositive = trend >= 0;

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-[#6B7280]">{title}</p>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBgClass}`}>
          <Icon className={`h-5 w-5 ${iconTextClass}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className={`text-3xl font-bold text-[#111827] ${valueClassName || ""}`}>{value}</p>
        <span className={`pb-1 text-xs font-semibold ${trendPositive ? "text-[#16A34A]" : "text-[#EF4444]"}`}>
          {trendPositive ? "▲" : "▼"} {Math.abs(trend)}%
        </span>
      </div>
      <p className="mt-1 text-xs font-medium text-[#9CA3AF]">{description}</p>
    </div>
  );
}
