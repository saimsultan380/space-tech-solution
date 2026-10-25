"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { TableDataExport } from "@/components/ui/table-data-export";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardStats,
  getSalesPerAgent,
  getSalesPerProcessor,
  getRevenueOverTime,
  getChargebacksPerEmployee,
  getAttendanceVsPerformance,
  getEmployeeMonthlyStats,
} from "@/lib/queries/reports";

const SalesPerAgentChart = dynamic(
  () =>
    import("./charts/sales-per-agent-chart").then((m) => m.SalesPerAgentChart),
  { ssr: false },
);
const SalesPerProcessorChart = dynamic(
  () =>
    import("./charts/sales-per-processor-chart").then(
      (m) => m.SalesPerProcessorChart,
    ),
  { ssr: false },
);
const RevenueChart = dynamic(
  () => import("./charts/revenue-chart").then((m) => m.RevenueChart),
  { ssr: false },
);
const ChargebacksChart = dynamic(
  () => import("./charts/chargebacks-chart").then((m) => m.ChargebacksChart),
  { ssr: false },
);
const AttendancePerformanceChart = dynamic(
  () =>
    import("./charts/attendance-performance-chart").then(
      (m) => m.AttendancePerformanceChart,
    ),
  { ssr: false },
);
const ConversionChart = dynamic(
  () => import("./charts/conversion-chart").then((m) => m.ConversionChart),
  { ssr: false },
);
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  Award,
  MessageSquare,
  Search,
  Building2,
} from "@/components/ui/icons";
import { useCurrency } from "@/components/providers/currency-provider";
import { StatsPeriodFilter } from "@/components/ui/stats-period-filter";
import {
  customRangeError,
  periodLabel,
  periodRange,
  type StatsPeriod,
} from "@/lib/stats-period";

interface EmployeeStat {
  id: string;
  name: string;
  role: string;
  totalSales: number;
  approvedSales: number;
  rejectedSales: number;
  revenue: number;
  daysPresent: number;
  totalHours: number;
  callLogResponses: number;
  chargebacks: number;
  chargebackRatio: number;
}

function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="mt-1 h-7 w-20 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

interface ReportsClientProps {
  month: string;
  from?: string;
  to?: string;
}

function periodFromProps(month: string, from?: string, to?: string): StatsPeriod {
  if (from && to && !customRangeError(from, to)) {
    return { mode: "custom", from, to };
  }
  return { mode: "month", month };
}

export function ReportsClient({ month, from, to }: ReportsClientProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [period, setPeriod] = useState<StatsPeriod>(() => periodFromProps(month, from, to));
  const [empSearch, setEmpSearch] = useState("");
  const [empRoleFilter, setEmpRoleFilter] = useState("all");
  const range = periodRange(period);
  const rangeKey = range ? `${range.from}:${range.to}` : month;
  const activeLabel = periodLabel(period);

  useEffect(() => {
    setPeriod(periodFromProps(month, from, to));
  }, [month, from, to]);

  // React Query hooks for fetching data
  const {
    data: stats = {
      totalSales: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      pendingSales: 0,
      approvedSales: 0,
      rejectedSales: 0,
      totalChargebacks: 0,
      openChargebacks: 0,
      totalCallLogs: 0,
      totalProcessingAccounts: 0,
      pendingLeaves: 0,
      todayOnLeave: 0,
      conversionRate: "0",
    },
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["reports-stats", rangeKey],
    queryFn: () => getDashboardStats(period.mode === "month" ? period.month : undefined, range),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const chartsEnabled = !statsLoading;

  const { data: salesPerAgent = [], isLoading: salesPerAgentLoading } =
    useQuery({
      queryKey: ["reports-sales-per-agent", rangeKey],
      queryFn: () => getSalesPerAgent(period.mode === "month" ? period.month : undefined, range),
      staleTime: 60_000,
      enabled: chartsEnabled,
      placeholderData: (prev) => prev,
    });

  const { data: salesPerProcessor = [], isLoading: salesPerProcessorLoading } =
    useQuery({
      queryKey: ["reports-sales-per-processor", rangeKey],
      queryFn: () =>
        getSalesPerProcessor(period.mode === "month" ? period.month : undefined, range),
      staleTime: 60_000,
      enabled: chartsEnabled,
      placeholderData: (prev) => prev,
    });

  // Only fetch the active revenue period — the other two load lazily when selected.
  const { data: revenueDaily = [], isLoading: revenueLoadingDaily } = useQuery({
    queryKey: ["reports-revenue", "daily", rangeKey],
    queryFn: () => getRevenueOverTime("day", range),
    staleTime: 60_000,
    enabled: chartsEnabled && revenuePeriod === "daily",
    placeholderData: (prev) => prev,
  });

  const { data: revenueWeekly = [], isLoading: revenueLoadingWeekly } =
    useQuery({
      queryKey: ["reports-revenue", "weekly", rangeKey],
      queryFn: () => getRevenueOverTime("week", range),
      staleTime: 60_000,
      enabled: chartsEnabled && revenuePeriod === "weekly",
      placeholderData: (prev) => prev,
    });

  const { data: revenueMonthly = [], isLoading: revenueLoadingMonthly } =
    useQuery({
      queryKey: ["reports-revenue", "monthly", rangeKey],
      queryFn: () => getRevenueOverTime("month", range),
      staleTime: 60_000,
      enabled: chartsEnabled && revenuePeriod === "monthly",
      placeholderData: (prev) => prev,
    });

  const { data: chargebacksPerEmployee = [], isLoading: chargebacksLoading } =
    useQuery({
      queryKey: ["reports-chargebacks", rangeKey],
      queryFn: () =>
        getChargebacksPerEmployee(period.mode === "month" ? period.month : undefined, range),
      staleTime: 60_000,
      enabled: chartsEnabled,
      placeholderData: (prev) => prev,
    });

  const { data: attendanceVsPerformance = [], isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["reports-attendance", rangeKey],
      queryFn: () =>
        getAttendanceVsPerformance(period.mode === "month" ? period.month : undefined, range),
      staleTime: 60_000,
      enabled: chartsEnabled,
      placeholderData: (prev) => prev,
    });

  const { data: employeeMonthlyStats = [], isLoading: employeeStatsLoading } =
    useQuery({
      queryKey: ["reports-employee-stats", rangeKey],
      queryFn: () =>
        getEmployeeMonthlyStats(period.mode === "month" ? period.month : undefined, range),
      staleTime: 60_000,
      enabled: chartsEnabled,
      placeholderData: (prev) => prev,
    });

  const revenueData = {
    daily: revenueDaily,
    weekly: revenueWeekly,
    monthly: revenueMonthly,
  };

  // Apply employee search + role filter client-side (data is already aggregated server-side)
  const filteredEmployees = useMemo(() => {
    let list = employeeMonthlyStats;
    if (empRoleFilter !== "all") {
      list = list.filter((e) => e.role === empRoleFilter);
    }
    if (empSearch.trim()) {
      const q = empSearch.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [employeeMonthlyStats, empRoleFilter, empSearch]);

  const empPage = Math.max(1, Number(searchParams.get("emp_page") || "1") || 1);
  const empPageSize = 20;
  const empTotalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / empPageSize),
  );
  const empCurrentPage = Math.min(empPage, empTotalPages);
  const empStartIndex = (empCurrentPage - 1) * empPageSize;
  const paginatedEmployees = filteredEmployees.slice(
    empStartIndex,
    empStartIndex + empPageSize,
  );

  const updateFilters = (
    updates: Record<string, string | number | undefined>,
  ) => {
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

  const handlePeriodChange = (next: StatsPeriod) => {
    setPeriod(next);
    if (next.mode === "month") {
      updateFilters({ month: next.month, from: "", to: "", emp_page: 1 });
      return;
    }
    if (next.mode === "custom") {
      updateFilters({ month: "", from: next.from, to: next.to, emp_page: 1 });
    }
  };

  const topPerformer = [...filteredEmployees]
    .filter((e) => e.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)[0];

  const employeePerformanceExportRows = useMemo(
    () =>
      filteredEmployees.map((emp) => [
        emp.name,
        ROLE_LABELS[emp.role] || emp.role,
        emp.totalSales,
        emp.approvedSales,
        emp.rejectedSales,
        formatCurrency(emp.revenue, currency),
        emp.daysPresent,
        `${emp.totalHours}h`,
        emp.callLogResponses,
        emp.chargebacks,
        `${emp.chargebackRatio}%`,
      ]),
    [employeeMonthlyStats, currency],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Comprehensive performance insights</p>
      </div>

      {/* ── Global filter bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <StatsPeriodFilter value={period} onChange={handlePeriodChange} />
        <span className="text-xs text-muted-foreground">
          Showing data for <strong>{activeLabel}</strong>
          {isPending ? " · updating…" : ""}
        </span>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue, currency)}
              description={`Approved sales · ${activeLabel}`}
              icon={<DollarSign className="h-4 w-4" />}
              colorClass="bg-blue-500"
            />
            <StatCard
              title="Total Sales"
              value={stats.totalSales}
              description={`All statuses · ${activeLabel}`}
              icon={<ShoppingCart className="h-4 w-4" />}
              colorClass="bg-emerald-500"
            />
            <StatCard
              title="Recorded Share"
              value={`${stats.conversionRate}%`}
              description="Approved ÷ total sales"
              icon={<TrendingUp className="h-4 w-4" />}
              colorClass="bg-violet-500"
            />
            <StatCard
              title="Open Chargebacks"
              value={stats.openChargebacks}
              description="Pending resolution"
              icon={<AlertTriangle className="h-4 w-4" />}
              colorClass="bg-rose-500"
            />
            <StatCard
              title="Total Chargebacks"
              value={stats.totalChargebacks}
              description="All time"
              icon={<AlertTriangle className="h-4 w-4" />}
              colorClass="bg-red-600"
            />
            <StatCard
              title="Call Log Responses"
              value={stats.totalCallLogs}
              description={`Customer leads · ${activeLabel}`}
              icon={<MessageSquare className="h-4 w-4" />}
              colorClass="bg-sky-500"
            />
            <StatCard
              title="Processing Accounts"
              value={stats.totalProcessingAccounts}
              description="Active in system"
              icon={<Building2 className="h-4 w-4" />}
              colorClass="bg-amber-500"
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              description="All registered"
              icon={<Users className="h-4 w-4" />}
              colorClass="bg-indigo-500"
            />
          </>
        )}
      </div>

      {/* ── Employee Performance Table ──────────────────────────────────────── */}
      <Card className="bg-gradient-to-br from-violet-500/[0.06] via-card to-card">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Employee Monthly Performance
                <span className="text-sm font-normal text-muted-foreground">— {activeLabel}</span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {topPerformer && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Award className="mr-1 h-3 w-3" /> Top: {topPerformer.name} ({formatCurrency(topPerformer.revenue, currency)})
                  </Badge>
                )}
                <TableDataExport
                  filenameBase={`employee-performance-${rangeKey}`}
                  headers={["Employee", "Role", "Total Sales", "Recorded", "Rejected", "Revenue", "Days Present", "Hours Worked", "Call Log Responses", "Chargebacks", "CB Ratio"]}
                  rows={employeePerformanceExportRows}
                  disabled={filteredEmployees.length === 0}
                  className="shrink-0"
                />
              </div>
            </div>

            {/* Employee-level filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search employee…"
                  value={empSearch}
                  onChange={(e) => { setEmpSearch(e.target.value); updateFilters({ emp_page: 1 }); }}
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Select
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "sales_agent", label: "Sales Agents" },
                  { value: "processor", label: "Processors" },
                  { value: "super_admin", label: "Admins" },
                ]}
                value={empRoleFilter}
                onChange={(e) => { setEmpRoleFilter(e.target.value); updateFilters({ emp_page: 1 }); }}
                className="h-9 w-auto min-w-[9rem]"
                containerClassName="space-y-0"
              />
              {(empSearch || empRoleFilter !== "all") && (
                <span className="text-xs text-muted-foreground">
                  {filteredEmployees.length} of {employeeMonthlyStats.length} employee{employeeMonthlyStats.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending || employeeStatsLoading} />
          {employeeStatsLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {employeeMonthlyStats.length === 0
                ? "No employee data for this period."
                : "No employees match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Recorded</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Days Present</TableHead>
                    <TableHead className="text-right">Hours Worked</TableHead>
                    <TableHead className="text-right">Call Logs</TableHead>
                    <TableHead className="text-right">Chargebacks</TableHead>
                    <TableHead className="text-right">CB Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABELS[emp.role] || emp.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{emp.totalSales}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{emp.approvedSales}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-red-600 dark:text-red-400">{emp.rejectedSales}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(emp.revenue, currency)}</TableCell>
                      <TableCell className="text-right">{emp.daysPresent}</TableCell>
                      <TableCell className="text-right">{emp.totalHours}h</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-sky-600 dark:text-sky-400">{emp.callLogResponses}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={emp.chargebacks > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                          {emp.chargebacks}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          emp.chargebackRatio > 10
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : emp.chargebackRatio > 0
                              ? "font-medium text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                        }>
                          {emp.chargebackRatio}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination
            currentPage={empCurrentPage}
            totalPages={empTotalPages}
            onPageChange={(p) => updateFilters({ emp_page: p })}
            totalItems={filteredEmployees.length}
            pageSize={empPageSize}
          />
        </CardContent>
      </Card>

      {/* ── Visual Analytics ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Visual Analytics</h2>
        <span className="text-sm text-muted-foreground">— {activeLabel}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Over Time */}
        <Card className="bg-gradient-to-br from-blue-500/[0.08] via-card to-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Over Time</CardTitle>
              <Tabs defaultValue={revenuePeriod}>
                <TabsList>
                  <TabsTrigger value="daily" onClick={() => setRevenuePeriod("daily")}>Daily</TabsTrigger>
                  <TabsTrigger value="weekly" onClick={() => setRevenuePeriod("weekly")}>Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" onClick={() => setRevenuePeriod("monthly")}>Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {(revenueLoadingDaily || revenueLoadingWeekly || revenueLoadingMonthly) ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <RevenueChart data={revenueData[revenuePeriod]} />
            )}
          </CardContent>
        </Card>

        {/* Sales Outcomes */}
        <Card className="bg-gradient-to-br from-emerald-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {statsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <ConversionChart recorded={stats.approvedSales} rejected={stats.rejectedSales} />
            )}
          </CardContent>
        </Card>

        {/* Sales per Agent */}
        <Card className="bg-gradient-to-br from-violet-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales per Agent</CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {salesPerAgentLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <SalesPerAgentChart data={salesPerAgent} />
            )}
          </CardContent>
        </Card>

        {/* Sales per Processor */}
        <Card className="bg-gradient-to-br from-sky-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales per Processor</CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {salesPerProcessorLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <SalesPerProcessorChart data={salesPerProcessor} />
            )}
          </CardContent>
        </Card>

        {/* Chargebacks per Employee */}
        <Card className="bg-gradient-to-br from-rose-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Chargebacks per Employee</CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {chargebacksLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <ChargebacksChart data={chargebacksPerEmployee} />
            )}
          </CardContent>
        </Card>

        {/* Attendance vs Performance */}
        <Card className="bg-gradient-to-br from-amber-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Attendance vs Performance</CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-[220px]">
            {attendanceLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <AttendancePerformanceChart data={attendanceVsPerformance} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
