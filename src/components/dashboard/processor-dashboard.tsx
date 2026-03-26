"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttendanceWidget } from "./attendance-widget";
import { PayslipDashboardCard } from "@/components/payslips/payslip-dashboard-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { updateSaleStatus } from "@/lib/actions/sales";
import type { AppUser, SaleStatus, Payslip } from "@/lib/types";
import type { CompanySettings } from "@/lib/actions/company-settings";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ListChecks,
  CalendarDays,
  Inbox,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface ProcessorDashboardProps {
  user: AppUser;
  stats: {
    pendingQueue: number;
    totalProcessed: number;
    todayProcessed: number;
    approvedByMe: number;
    rejectedByMe: number;
    todayApproved: number;
    todayRejected: number;
    processedRevenue: number;
  };
  pendingSales: Array<{
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
}

export function ProcessorDashboard({
  user,
  stats,
  pendingSales,
  todayAttendance,
  recentPayslips,
  attendanceSettings,
  companySettings,
}: ProcessorDashboardProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const { currency } = useCurrency();

  const handleQuickAction = async (saleId: string, status: SaleStatus) => {
    setProcessing(saleId);
    try {
      await updateSaleStatus(saleId, status, `Quick ${status} from processor dashboard`);
    } catch {
      // error
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Good {getGreeting()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Processing Hub, {user.full_name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {stats.pendingQueue} sale{stats.pendingQueue !== 1 ? "s" : ""} waiting in queue.
        </p>
      </div>

      {/* Today's stats */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Queue"
            value={stats.pendingQueue}
            icon={<Inbox className="h-5 w-5" />}
            description="Awaiting review"
            colorClass="bg-amber-500"
          />
          <StatCard
            title="Today Processed"
            value={stats.todayProcessed}
            icon={<ListChecks className="h-5 w-5" />}
            description={`${stats.todayApproved} approved, ${stats.todayRejected} rejected`}
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Approved Revenue"
            value={formatCurrency(stats.processedRevenue, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            description="Total approved value"
            colorClass="bg-emerald-500"
          />
          <AttendanceWidget todayAttendance={todayAttendance} attendanceSettings={attendanceSettings} />
        </div>
      </div>

      {/* All-time stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Processed"
          value={stats.totalProcessed}
          icon={<ListChecks className="h-5 w-5" />}
          colorClass="bg-violet-500"
        />
        <StatCard
          title="Approved"
          value={stats.approvedByMe}
          icon={<CheckCircle className="h-5 w-5" />}
          colorClass="bg-green-500"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedByMe}
          icon={<XCircle className="h-5 w-5" />}
          colorClass="bg-rose-500"
        />
      </div>

      {/* Pending queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4" /> Pending Sales Queue
            </CardTitle>
            <Link
              href="/dashboard/sales"
              className="text-sm font-medium text-primary hover:underline"
            >
              View All Sales
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {pendingSales.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500/50" />
              <p className="font-medium">All caught up!</p>
              <p className="mt-1 text-sm text-muted-foreground">No pending sales to process.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-border/50 p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sale.customer_name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {sale.sale_type} / {sale.subtype}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sale.company_name} &middot; Agent: {sale.agent_name} &middot;{" "}
                        {formatDate(sale.created_at)}
                      </p>
                      {sale.sales_notes && (
                        <p className="text-sm italic text-muted-foreground">
                          &ldquo;{sale.sales_notes.substring(0, 100)}
                          {sale.sales_notes.length > 100 ? "..." : ""}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {formatCurrency(sale.charged_amount, currency)}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                          disabled={processing === sale.id}
                          onClick={() => handleQuickAction(sale.id, "approved")}
                        >
                          {processing === sale.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={processing === sale.id}
                          onClick={() => handleQuickAction(sale.id, "rejected")}
                        >
                          {processing === sale.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Reject
                        </Button>
                        <Link href={`/dashboard/sales/${sale.id}`}>
                          <Button size="sm" variant="ghost">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDashboardCard payslips={recentPayslips} title="My Recent Payslips" companySettings={companySettings} />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
