"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceWidget } from "./attendance-widget";
import { PayslipDashboardCard } from "@/components/payslips/payslip-dashboard-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { AppUser, Payslip } from "@/lib/types";
import type { CompanySettings } from "@/lib/actions/company-settings";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

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
    created_at: string;
    customer_name: string;
  }>;
  todayAttendance: { id: string; check_in: string; check_out: string | null } | null;
  recentPayslips: Payslip[];
  attendanceSettings: {
    shift_start_12h: string;
    shift_end_12h: string;
    checkout_latest_12h: string;
    shift_end_time: string;
    checkout_latest_time: string;
    checkout_grace_minutes: number;
    allow_early_checkout: boolean;
    early_checkout_minutes: number;
  };
  companySettings: CompanySettings;
  month: string;
}

export function AgentDashboard({
  user,
  stats,
  recentSales,
  todayAttendance,
  recentPayslips,
  attendanceSettings,
  companySettings,
  month,
}: AgentDashboardProps) {
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(month);

  useEffect(() => {
    setSelectedMonth(month);
  }, [month]);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const current = new Date();

    for (let i = 0; i < 6; i += 1) {
      const d = new Date(current);
      d.setMonth(current.getMonth() - i);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
      options.push({ value, label });
    }

    return options;
  }, []);

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    updateFilters({ month: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Good {getGreeting()}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome, {user.full_name}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s your performance overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="month-filter" className="text-sm font-medium text-muted-foreground">
            Month:
          </label>
          <select
            id="month-filter"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
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
            description="From your sales (excl. rejected)"
            colorClass="bg-emerald-500"
          />
          <StatCard
            title="Total Sales"
            value={stats.totalSales}
            icon={<ShoppingCart className="h-5 w-5" />}
            description="All time"
            colorClass="bg-amber-500"
          />
          <AttendanceWidget todayAttendance={todayAttendance} attendanceSettings={attendanceSettings} />
        </div>
      </div>

      {/* Monthly stats */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> {monthOptions.find((m) => m.value === selectedMonth)?.label || "This Month"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={`${monthOptions.find((m) => m.value === selectedMonth)?.label || "This Month"} Sales`}
            value={stats.monthSales}
            icon={<ShoppingCart className="h-5 w-5" />}
            colorClass="bg-violet-500"
          />
          <StatCard
            title={`${monthOptions.find((m) => m.value === selectedMonth)?.label || "This Month"} Revenue`}
            value={formatCurrency(stats.monthRevenue, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            colorClass="bg-sky-500"
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
              <ShoppingCart className="h-4 w-4" /> Recent Sales ({monthOptions.find((m) => m.value === selectedMonth)?.label || "This Month"})
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

      <PayslipDashboardCard payslips={recentPayslips} title="My Recent Payslips" companySettings={companySettings} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="text-center">
          <CardContent className="pt-6">
            <DollarSign className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <p className="text-2xl font-semibold">{formatCurrency(stats.totalRevenue, currency)}</p>
            <p className="text-sm text-muted-foreground">Total revenue (excl. rejected)</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-violet-500" />
            <p className="text-2xl font-semibold">{stats.totalSales}</p>
            <p className="text-sm text-muted-foreground">Total sales</p>
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
