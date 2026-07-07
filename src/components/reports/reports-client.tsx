"use client";

import { useState, useMemo, useTransition } from "react";
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
} from "@/components/ui/icons";
import { useCurrency } from "@/components/providers/currency-provider";

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

interface ReportsClientProps {
  month: string;
}

export function ReportsClient({ month }: ReportsClientProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(month);

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
    queryKey: ["reports-stats", selectedMonth],
    queryFn: () => getDashboardStats(selectedMonth),
    staleTime: 30000,
  });

  const { data: salesPerAgent = [], isLoading: salesPerAgentLoading } =
    useQuery({
      queryKey: ["reports-sales-per-agent", selectedMonth],
      queryFn: () => getSalesPerAgent(selectedMonth),
      staleTime: 30000,
    });

  const { data: salesPerProcessor = [], isLoading: salesPerProcessorLoading } =
    useQuery({
      queryKey: ["reports-sales-per-processor", selectedMonth],
      queryFn: () => getSalesPerProcessor(selectedMonth),
      staleTime: 30000,
    });

  // Only fetch the active revenue period — the other two load lazily when selected.
  const { data: revenueDaily = [], isLoading: revenueLoadingDaily } = useQuery({
    queryKey: ["reports-revenue", "daily"],
    queryFn: () => getRevenueOverTime("day"),
    staleTime: 30000,
    enabled: revenuePeriod === "daily",
  });

  const { data: revenueWeekly = [], isLoading: revenueLoadingWeekly } =
    useQuery({
      queryKey: ["reports-revenue", "weekly"],
      queryFn: () => getRevenueOverTime("week"),
      staleTime: 30000,
      enabled: revenuePeriod === "weekly",
    });

  const { data: revenueMonthly = [], isLoading: revenueLoadingMonthly } =
    useQuery({
      queryKey: ["reports-revenue", "monthly"],
      queryFn: () => getRevenueOverTime("month"),
      staleTime: 30000,
      enabled: revenuePeriod === "monthly",
    });

  const { data: chargebacksPerEmployee = [], isLoading: chargebacksLoading } =
    useQuery({
      queryKey: ["reports-chargebacks", selectedMonth],
      queryFn: () => getChargebacksPerEmployee(selectedMonth),
      staleTime: 30000,
    });

  const { data: attendanceVsPerformance = [], isLoading: attendanceLoading } =
    useQuery({
      queryKey: ["reports-attendance", selectedMonth],
      queryFn: () => getAttendanceVsPerformance(selectedMonth),
      staleTime: 30000,
    });

  const { data: employeeMonthlyStats = [], isLoading: employeeStatsLoading } =
    useQuery({
      queryKey: ["reports-employee-stats", selectedMonth],
      queryFn: () => getEmployeeMonthlyStats(selectedMonth),
      staleTime: 30000,
    });

  const revenueData = {
    daily: revenueDaily,
    weekly: revenueWeekly,
    monthly: revenueMonthly,
  };

  const empPage = Math.max(1, Number(searchParams.get("emp_page") || "1") || 1);
  const empPageSize = 10;
  const empTotalPages = Math.max(
    1,
    Math.ceil(employeeMonthlyStats.length / empPageSize),
  );
  const empCurrentPage = Math.min(empPage, empTotalPages);
  const empStartIndex = (empCurrentPage - 1) * empPageSize;
  const paginatedEmployees = employeeMonthlyStats.slice(
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

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    updateFilters({ month: value, emp_page: 1 });
  };

  const topPerformer = [...employeeMonthlyStats]
    .filter((e) => e.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)[0];

  const employeePerformanceExportRows = useMemo(
    () =>
      employeeMonthlyStats.map((emp) => [
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="month-filter"
            className="text-sm font-medium text-muted-foreground"
          >
            Month:
          </label>
          <select
            id="month-filter"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue, currency)}
              icon={<DollarSign className="h-4 w-4" />}
              colorClass="bg-blue-500"
            />
            <StatCard
              title="Total Sales"
              value={stats.totalSales}
              icon={<ShoppingCart className="h-4 w-4" />}
              colorClass="bg-emerald-500"
            />
            <StatCard
              title="Recorded share"
              value={`${stats.conversionRate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              colorClass="bg-violet-500"
            />
            <StatCard
              title="Open Chargebacks"
              value={stats.openChargebacks}
              icon={<AlertTriangle className="h-4 w-4" />}
              colorClass="bg-rose-500"
            />
            <StatCard
              title="Total Chargebacks"
              value={stats.totalChargebacks}
              icon={<AlertTriangle className="h-4 w-4" />}
              colorClass="bg-red-600"
            />
            <StatCard
              title="Call Log Responses"
              value={stats.totalCallLogs}
              icon={<MessageSquare className="h-4 w-4" />}
              colorClass="bg-sky-500"
            />
            <StatCard
              title="Processing Accounts"
              value={stats.totalProcessingAccounts}
              icon={<Users className="h-4 w-4" />}
              colorClass="bg-amber-500"
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={<Users className="h-4 w-4" />}
              colorClass="bg-indigo-500"
            />
          </>
        )}
      </div>

      {/* Employee Performance Table */}
      <Card className="bg-gradient-to-br from-violet-500/[0.06] via-card to-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Monthly Performance
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {topPerformer && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Award className="mr-1 h-3 w-3" /> Top: {topPerformer.name} (
                  {formatCurrency(topPerformer.revenue, currency)})
                </Badge>
              )}
              <TableDataExport
                filenameBase={`employee-performance-${selectedMonth}`}
                headers={[
                  "Employee",
                  "Role",
                  "Total Sales",
                  "Recorded",
                  "Rejected",
                  "Revenue",
                  "Days Present",
                  "Hours Worked",
                  "Call Log Responses",
                  "Chargebacks",
                  "CB Ratio",
                ]}
                rows={employeePerformanceExportRows}
                disabled={employeeMonthlyStats.length === 0}
                className="shrink-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {employeeMonthlyStats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No employee data for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Days Present</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Call Log Responses</TableHead>
                    <TableHead>Chargebacks</TableHead>
                    <TableHead>CB Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ROLE_LABELS[emp.role] || emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.totalSales}</TableCell>
                      <TableCell>
                        <span className="text-green-600">
                          {emp.approvedSales}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600">
                          {emp.rejectedSales}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(emp.revenue, currency)}
                      </TableCell>
                      <TableCell>{emp.daysPresent}</TableCell>
                      <TableCell>{emp.totalHours}h</TableCell>
                      <TableCell>
                        <span className="text-sky-600 font-medium">
                          {emp.callLogResponses}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            emp.chargebacks > 0
                              ? "text-red-600 font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {emp.chargebacks}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            emp.chargebackRatio > 10
                              ? "text-red-600 font-semibold"
                              : emp.chargebackRatio > 0
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground"
                          }
                        >
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
            totalItems={employeeMonthlyStats.length}
            pageSize={empPageSize}
          />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Visual Analytics</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-500/[0.08] via-card to-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Over Time</CardTitle>
              <Tabs defaultValue="daily">
                <TabsList>
                  <TabsTrigger
                    value="daily"
                    onClick={() => setRevenuePeriod("daily")}
                  >
                    Daily
                  </TabsTrigger>
                  <TabsTrigger
                    value="weekly"
                    onClick={() => setRevenuePeriod("weekly")}
                  >
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger
                    value="monthly"
                    onClick={() => setRevenuePeriod("monthly")}
                  >
                    Monthly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData[revenuePeriod]} />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart
              recorded={stats.approvedSales}
              rejected={stats.rejectedSales}
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales per Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesPerAgentChart data={salesPerAgent} />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Sales per Processor</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesPerProcessorChart data={salesPerProcessor} />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Chargebacks per Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ChargebacksChart data={chargebacksPerEmployee} />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle>Attendance vs Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendancePerformanceChart data={attendanceVsPerformance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
