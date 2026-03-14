"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { AttendanceWidget } from "./attendance-widget";
import { RevenueChart } from "@/components/reports/charts/revenue-chart";
import { SalesPerAgentChart } from "@/components/reports/charts/sales-per-agent-chart";
import { ConversionChart } from "@/components/reports/charts/conversion-chart";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { AppUser } from "@/lib/types";
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
}

export function DashboardClient({
  user,
  stats,
  todayAttendance,
  salesPerAgent,
  revenueData,
}: DashboardClientProps) {
  const [showCharts, setShowCharts] = useState(true);
  const { currency } = useCurrency();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Good {getGreeting()}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {user.full_name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your business today.
          </p>
        </div>
        <button
          onClick={() => setShowCharts((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground"
        >
          {showCharts ? (
            <><EyeOff className="h-4 w-4" /> Hide Charts</>
          ) : (
            <><Eye className="h-4 w-4" /> Show Charts</>
          )}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue, currency)}
          icon={<DollarSign className="h-5 w-5" />}
          description="From approved sales"
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon={<ShoppingCart className="h-5 w-5" />}
          description={`${stats.pendingSales} pending`}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={<Users className="h-5 w-5" />}
          description="In your database"
          colorClass="bg-violet-500"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          description={`${stats.approvedSales} approved of ${stats.totalSales}`}
          colorClass="bg-amber-500"
        />
      </div>

      {/* Secondary stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Pending Sales"
          value={stats.pendingSales}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting processing"
          colorClass="bg-sky-500"
        />
        <StatCard
          title="Open Chargebacks"
          value={stats.openChargebacks}
          icon={<AlertTriangle className="h-5 w-5" />}
          description={`${stats.totalChargebacks} total chargebacks`}
          colorClass="bg-rose-500"
        />
        <StatCard
          title="Pending Leave Requests"
          value={stats.pendingLeaves}
          icon={<CalendarDays className="h-5 w-5" />}
          description={`${stats.todayOnLeave} employees on leave today`}
          colorClass="bg-indigo-500"
        />
        <AttendanceWidget todayAttendance={todayAttendance} />
      </div>

      {/* Charts section with toggle */}
      {showCharts && (
        <div className="space-y-6 animate-[slide-up_0.3s_ease-out]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Analytics Overview</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue chart */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Revenue Trend</h3>
                  <p className="text-xs text-muted-foreground">Daily revenue from approved sales</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <RevenueChart data={revenueData} />
            </div>

            {/* Conversion pie chart */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Sales Conversion</h3>
                  <p className="text-xs text-muted-foreground">Approved vs pending vs rejected</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <ConversionChart
                approved={stats.approvedSales}
                pending={stats.pendingSales}
                rejected={stats.rejectedSales}
              />
            </div>

            {/* Sales per agent */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Sales per Agent</h3>
                  <p className="text-xs text-muted-foreground">Performance breakdown by agent</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Users className="h-4 w-4 text-violet-500" />
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
