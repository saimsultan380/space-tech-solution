"use client";

import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendanceWidget } from "./attendance-widget";
import { PayslipDashboardCard } from "@/components/payslips/payslip-dashboard-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { AppUser, Payslip } from "@/lib/types";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

interface AgentDashboardProps {
  user: AppUser;
  stats: {
    totalSales: number;
    todaySales: number;
    todayRevenue: number;
    monthSales: number;
    monthRevenue: number;
    pendingSales: number;
    approvedSales: number;
    rejectedSales: number;
    totalRevenue: number;
    totalCustomers: number;
  };
  recentSales: Array<{
    id: string;
    company_name: string;
    charged_amount: number;
    status: string;
    created_at: string;
    customer_name: string;
  }>;
  todayAttendance: { id: string; check_in: string; check_out: string | null } | null;
  recentPayslips: Payslip[];
  attendanceSettings: {
    shift_start_12h: string;
    shift_end_12h: string;
  };
}

export function AgentDashboard({
  user,
  stats,
  recentSales,
  todayAttendance,
  recentPayslips,
  attendanceSettings,
}: AgentDashboardProps) {
  const { currency } = useCurrency();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Good {getGreeting()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Welcome, {user.full_name}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s your performance overview.</p>
      </div>

      {/* Today's stats */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value={stats.todaySales}
            icon={<ShoppingCart className="h-5 w-5" />}
            description="Sales created today"
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(stats.todayRevenue, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            description="From approved sales"
            colorClass="bg-emerald-500"
          />
          <StatCard
            title="Pending"
            value={stats.pendingSales}
            icon={<Clock className="h-5 w-5" />}
            description="Awaiting processing"
            colorClass="bg-amber-500"
          />
          <AttendanceWidget todayAttendance={todayAttendance} attendanceSettings={attendanceSettings} />
        </div>
      </div>

      {/* Monthly stats */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> This Month
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Month Sales"
            value={stats.monthSales}
            icon={<ShoppingCart className="h-5 w-5" />}
            colorClass="bg-violet-500"
          />
          <StatCard
            title="Month Revenue"
            value={formatCurrency(stats.monthRevenue, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            colorClass="bg-sky-500"
          />
          <StatCard
            title="Approved"
            value={stats.approvedSales}
            icon={<CheckCircle className="h-5 w-5" />}
            colorClass="bg-green-500"
          />
          <StatCard
            title="My Call Logs Responses"
            value={stats.totalCustomers}
            icon={<Users className="h-5 w-5" />}
            colorClass="bg-rose-500"
          />
        </div>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-4 w-4" /> Recent Sales
            </CardTitle>
            <Link
              href="/dashboard/sales"
              className="text-sm font-medium text-primary hover:underline"
            >
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sales yet. Create your first sale to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/dashboard/sales/${sale.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sale.customer_name}</span>
                      <Badge variant={statusVariant[sale.status] || "default"} className="capitalize">
                        {sale.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {sale.company_name} &middot; {formatDate(sale.created_at)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatCurrency(sale.charged_amount, currency)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDashboardCard payslips={recentPayslips} title="My Recent Payslips" />

      {/* Quick summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <CardContent className="pt-6">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p className="text-2xl font-bold">{stats.approvedSales}</p>
            <p className="text-sm text-muted-foreground">Total Approved</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-2xl font-bold">{stats.rejectedSales}</p>
            <p className="text-sm text-muted-foreground">Total Rejected</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <DollarSign className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, currency)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
