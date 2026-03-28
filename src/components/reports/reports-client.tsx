"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { SalesPerAgentChart } from "./charts/sales-per-agent-chart";
import { SalesPerProcessorChart } from "./charts/sales-per-processor-chart";
import { RevenueChart } from "./charts/revenue-chart";
import { ChargebacksChart } from "./charts/chargebacks-chart";
import { AttendancePerformanceChart } from "./charts/attendance-performance-chart";
import { ConversionChart } from "./charts/conversion-chart";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  Award,
} from "lucide-react";
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
}

interface ReportsClientProps {
  stats: {
    totalSales: number;
    totalRevenue: number;
    pendingSales: number;
    approvedSales: number;
    rejectedSales: number;
    totalChargebacks: number;
    openChargebacks: number;
    conversionRate: string;
  };
  salesPerAgent: Array<{ name: string; total: number; approved: number; revenue: number }>;
  salesPerProcessor: Array<{ name: string; total: number; approved: number; rejected: number }>;
  revenueData: {
    daily: Array<{ date: string; revenue: number }>;
    weekly: Array<{ date: string; revenue: number }>;
    monthly: Array<{ date: string; revenue: number }>;
  };
  chargebacksPerEmployee: Array<{ name: string; count: number }>;
  attendanceVsPerformance: Array<{ name: string; attendance_days: number; approved_sales: number }>;
  employeeMonthlyStats: EmployeeStat[];
  month: string;
}

export function ReportsClient({
  stats,
  salesPerAgent,
  salesPerProcessor,
  revenueData,
  chargebacksPerEmployee,
  attendanceVsPerformance,
  employeeMonthlyStats,
  month,
}: ReportsClientProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(month);

  const empPage = Math.max(1, Number(searchParams.get("emp_page") || "1") || 1);
  const empPageSize = 10;
  const empTotalPages = Math.max(1, Math.ceil(employeeMonthlyStats.length / empPageSize));
  const empCurrentPage = Math.min(empPage, empTotalPages);
  const empStartIndex = (empCurrentPage - 1) * empPageSize;
  const paginatedEmployees = employeeMonthlyStats.slice(empStartIndex, empStartIndex + empPageSize);

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
      ]),
    [employeeMonthlyStats, currency],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive performance insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="Conversion Rate"
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
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Monthly Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-[4px] border border-border bg-background px-2 py-1 text-xs text-foreground shadow-sm"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
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
                  "Approved",
                  "Rejected",
                  "Revenue",
                  "Days Present",
                  "Hours Worked",
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Days Present</TableHead>
                  <TableHead>Hours Worked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[emp.role] || emp.role}</Badge>
                    </TableCell>
                    <TableCell>{emp.totalSales}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{emp.approvedSales}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600">{emp.rejectedSales}</span>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(emp.revenue, currency)}</TableCell>
                    <TableCell>{emp.daysPresent}</TableCell>
                    <TableCell>{emp.totalHours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Over Time</CardTitle>
              <Tabs defaultValue="daily">
                <TabsList>
                  <TabsTrigger value="daily" onClick={() => setRevenuePeriod("daily")}>
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" onClick={() => setRevenuePeriod("weekly")}>
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="monthly" onClick={() => setRevenuePeriod("monthly")}>
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

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart
              approved={stats.approvedSales}
              pending={stats.pendingSales}
              rejected={stats.rejectedSales}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales per Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesPerAgentChart data={salesPerAgent} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales per Processor</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesPerProcessorChart data={salesPerProcessor} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chargebacks per Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ChargebacksChart data={chargebacksPerEmployee} />
          </CardContent>
        </Card>

        <Card>
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
