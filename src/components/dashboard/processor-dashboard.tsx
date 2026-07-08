"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceWidget } from "./attendance-widget";
import { PayslipDashboardCard } from "@/components/payslips/payslip-dashboard-card";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  canAccessCallLogsResponses,
  hasDismissedProcessorCallLogsDashboardCta,
} from "@/lib/nav-access";
import type { AppUser, Payslip } from "@/lib/types";
import type { CompanySettings } from "@/lib/actions/company-settings";
import { DollarSign, ShoppingCart, CalendarDays, TrendingUp, Contact, ArrowRight } from "@/components/ui/icons";
import Link from "next/link";

interface ProcessorDashboardProps {
  user: AppUser;
  stats: {
    totalSales: number;
    salesThisWeek: number;
    weekRecordedRevenue: number;
  };
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
  } | undefined;
  companySettings: CompanySettings | undefined;
  secondaryLoading?: boolean;
}

export function ProcessorDashboard({
  user,
  stats,
  todayAttendance,
  recentPayslips,
  attendanceSettings,
  companySettings,
  secondaryLoading,
}: ProcessorDashboardProps) {
  const { currency } = useCurrency();
  const queryClient = useQueryClient();
  const [showCallLogsCta, setShowCallLogsCta] = useState(false);

  const hasCallLogsAccess = canAccessCallLogsResponses(user.role, user.allowed_modules);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("processor-dashboard-changes")
      // Only sales changes matter for processor stats — chargebacks don't affect any metric shown
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        queryClient.invalidateQueries({ queryKey: ["processor-dashboard-stats"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!hasCallLogsAccess) {
      setShowCallLogsCta(false);
      return;
    }
    setShowCallLogsCta(!hasDismissedProcessorCallLogsDashboardCta());
  }, [hasCallLogsAccess]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Good {getGreeting()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Welcome, {user.full_name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          View sales, attendance, and payslips.
        </p>
      </div>

      {showCallLogsCta && (
        <Card className="border-primary/25 bg-primary/[0.06]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Contact className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Call Logs Responses</p>
                <p className="text-sm text-muted-foreground">
                  Open customer call logs your admin has enabled for your account.
                </p>
              </div>
            </div>
            <Link href="/dashboard/call-logs-responses" className="shrink-0">
              <Button className="w-full sm:w-auto">Open Call Logs</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sales"
            value={stats.totalSales}
            icon={<ShoppingCart className="h-5 w-5" />}
            description="All time"
            colorClass="bg-violet-500"
          />
          <StatCard
            title="New Sales (7 days)"
            value={stats.salesThisWeek}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Recently created"
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Week Revenue"
            value={formatCurrency(stats.weekRecordedRevenue, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            description="Non-rejected sales"
            colorClass="bg-emerald-500"
          />
          <AttendanceWidget todayAttendance={todayAttendance} attendanceSettings={attendanceSettings} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Sales</CardTitle>
            <Link href="/dashboard/sales">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                Open sales list
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Search and open any sale for full customer and payment details.
          </p>
        </CardContent>
      </Card>

      {companySettings && (
        <PayslipDashboardCard payslips={recentPayslips} title="My Recent Payslips" companySettings={companySettings} />
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
