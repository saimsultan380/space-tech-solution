"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select as SelectField } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { ChargebackFormDialog } from "./chargeback-form-dialog";
import { deleteChargeback, updateChargebackPriority, updateChargebackStatus } from "@/lib/actions/chargebacks";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHARGEBACK_PRIORITIES, CHARGEBACK_STATUSES } from "@/lib/constants";
import type { UserRole, ChargebackPriority, ChargebackStatus } from "@/lib/types";
import {
  Plus,
  Trash2,
  ListX,
  CircleDollarSign,
  Clock3,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Search,
  FileSpreadsheet,
  BarChart3,
  Check,
  ChevronDown,
} from "@/components/ui/icons";
import Link from "next/link";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { downloadTableXlsx } from "@/lib/table-export";
import { ChargebackCaseDialog } from "./chargeback-case-dialog";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { DropdownRangeDatePicker, toDateRangeFromFilters, toFilterDates } from "@/components/ui/dropdown-range-date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  open: "warning",
  resolved: "success",
  disputed: "destructive",
};

const priorityVariant: Record<ChargebackPriority, "default" | "success" | "destructive" | "warning"> = {
  high: "destructive",
  medium: "warning",
  low: "default",
};

const reasonChartColors = ["#3B82F6", "#8B5CF6", "#14B8A6", "#F59E0B", "#EF4444"];

interface ChargebacksClientProps {
  chargebacksResponse: {
    data: Array<{
      id: string;
      date: string;
      reason: string;
      status: string;
      priority: ChargebackPriority;
      created_at: string;
      assigned_to: string | null;
      sale: {
        id: string;
        created_at: string;
        sale_type?: string | null;
        subtype?: string | null;
        charged_amount?: number | null;
        company_name: string;
        customer_email?: string | null;
        agent_id: string;
        customer_name?: string | null;
        agent: { full_name: string } | null;
      } | null;
      assignee: { id: string; full_name: string } | null;
    }>;
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    stats: {
      total: number;
      open: number;
      resolved: number;
      disputed: number;
      assigned: number;
      impactedAmount: number;
      avgResolutionDays: number;
      resolutionRate: number;
      disputeSuccessRate: number;
      byMonth: Array<{ month: string; count: number }>;
      topReasons: Array<{ reason: string; count: number }>;
    };
  };
  userRole: UserRole;
  assignees: Array<{ id: string; full_name: string }>;
}

export function ChargebacksClient({ chargebacksResponse, userRole, assignees }: ChargebacksClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { currency } = useCurrency();

  const { data: chargebacks, count, page, totalPages, pageSize, stats } = chargebacksResponse;

  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const canCreate = userRole === "super_admin" || userRole === "processor" || userRole === "sales_agent";
  const canManage = userRole === "super_admin" || userRole === "processor";

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const { inputRef, inputValue: searchInput, onInputChange } = useDebouncedUrlSearchInput(searchParams, updateFilters);
  const statusFilter = searchParams.get("status") || "all";
  const selectedStatusFilters = statusFilter === "all" ? [] : statusFilter.split(",").filter(Boolean);
  const assignedToFilter = searchParams.get("assigned_to") || "all";
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";
  const minAmountFilter = searchParams.get("min_amount") || "";
  const maxAmountFilter = searchParams.get("max_amount") || "";
  const quickRangeFilter = searchParams.get("quick_range") || "custom";

  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const applyQuickRange = (range: "custom" | "last7" | "last30" | "quarter") => {
    if (range === "custom") {
      updateFilters({ quick_range: "custom", page: 1 });
      return;
    }
    const today = new Date();
    const toDate = toDateInputValue(today);
    const fromDate = new Date(today);
    if (range === "last7") {
      fromDate.setDate(today.getDate() - 6);
    } else if (range === "last30") {
      fromDate.setDate(today.getDate() - 29);
    } else {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      fromDate.setMonth(quarterStartMonth, 1);
    }
    updateFilters({
      from_date: toDateInputValue(fromDate),
      to_date: toDate,
      quick_range: range,
      page: 1,
    });
  };

  const toggleStatusFilter = (statusValue: string) => {
    const nextStatuses = selectedStatusFilters.includes(statusValue)
      ? selectedStatusFilters.filter((value) => value !== statusValue)
      : [...selectedStatusFilters, statusValue];
    updateFilters({
      status: nextStatuses.length > 0 ? nextStatuses.join(",") : "all",
      page: 1,
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateChargebackStatus(id, status as ChargebackStatus);
    } catch {
      // error handling
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this chargeback? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteChargeback(id);
    } catch {
      // error handling
    }
    setDeletingId(null);
  };

  const handlePriorityChange = async (id: string, priority: string) => {
    setUpdatingPriorityId(id);
    try {
      await updateChargebackPriority(id, priority as ChargebackPriority);
    } catch {
      // error handling
    }
    setUpdatingPriorityId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chargebacks</h1>
          <p className="text-muted-foreground">Manage and track chargebacks</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Chargeback
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="bg-gradient-to-br from-blue-500/[0.12] to-indigo-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total chargebacks</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ListX className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/[0.12] to-yellow-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Impacted amount</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <CircleDollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(stats.impactedAmount, currency)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/[0.12] to-amber-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Open</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Resolved</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.resolved}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/[0.12] to-red-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Disputed</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.disputed}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/[0.12] to-indigo-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserCheck className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.assigned}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-500/[0.1] to-teal-500/[0.05]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Resolution rate</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.resolutionRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/[0.1] to-indigo-500/[0.05]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Avg resolution time</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.avgResolutionDays} days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/[0.1] to-yellow-500/[0.05]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Dispute success rate</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.disputeSuccessRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-violet-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle className="text-sm">Monthly chargeback volume</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byMonth.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/[0.08] via-card to-card">
          <CardHeader>
            <CardTitle className="text-sm">Top chargeback reasons</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topReasons.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No reasons available</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.topReasons} dataKey="count" nameKey="reason" innerRadius={50} outerRadius={80}>
                      {stats.topReasons.map((_, index) => (
                        <Cell key={`reason-${index}`} fill={reasonChartColors[index % reasonChartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {stats.topReasons.map((entry, index) => (
                    <div key={entry.reason} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: reasonChartColors[index % reasonChartColors.length] }}
                        />
                        <span className="max-w-[220px] truncate">{entry.reason}</span>
                      </div>
                      <span className="text-muted-foreground">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {count} chargeback{count !== 1 ? "s" : ""}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={chargebacks.length === 0}
              onClick={() =>
                void downloadTableXlsx(
                  [
                    "Customer",
                    "Company",
                    "Type",
                    "Amount",
                    "Agent",
                    "Sale Date",
                    "Assigned to",
                    "Chargeback Date",
                    "Reason",
                    "Status",
                  ],
                  chargebacks.map((cb) => [
                    cb.sale?.customer_name || "N/A",
                    cb.sale?.company_name || "N/A",
                    cb.sale?.sale_type ? `${cb.sale.sale_type} ${cb.sale.subtype ? `(${cb.sale.subtype})` : ""}` : "N/A",
                    cb.sale?.charged_amount != null ? formatCurrency(Number(cb.sale.charged_amount), currency) : "N/A",
                    cb.sale?.agent?.full_name || "N/A",
                    cb.sale?.created_at ? formatDate(cb.sale.created_at) : "N/A",
                    cb.assignee?.full_name || "—",
                    cb.date ? formatDate(cb.date) : "N/A",
                    cb.reason,
                    cb.status,
                  ]),
                  "chargebacks",
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Export
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="relative sm:col-span-9">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search by reason, customer, company, or agent..."
                value={searchInput}
                onChange={(e) => onInputChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="sm:col-span-3 min-w-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  updateFilters({
                    q: "",
                    status: "all",
                    assigned_to: "all",
                    from_date: "",
                    to_date: "",
                    min_amount: "",
                    max_amount: "",
                    quick_range: "custom",
                  })
                }
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-2 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3.5 py-2 text-left text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <span className="truncate">
                      {selectedStatusFilters.length === 0
                        ? "All statuses"
                        : selectedStatusFilters.length === 1
                          ? CHARGEBACK_STATUSES.find((s) => s.value === selectedStatusFilters[0])?.label || "1 status"
                          : `${selectedStatusFilters.length} statuses selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-2" align="start">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-medium text-muted-foreground">Select statuses</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => updateFilters({ status: "all", page: 1 })}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {CHARGEBACK_STATUSES.map((status) => {
                      const isSelected = selectedStatusFilters.includes(status.value);
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => toggleStatusFilter(status.value)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span>{status.label}</span>
                          {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {userRole !== "sales_agent" && (
              <div className="xl:col-span-2 min-w-0">
                <SelectField
                  options={[
                    { value: "all", label: "All Assignees" },
                    ...assignees.map((u) => ({ value: u.id, label: u.full_name })),
                  ]}
                  value={assignedToFilter}
                  onChange={(e) => updateFilters({ assigned_to: e.target.value, page: 1 })}
                />
              </div>
            )}
            <div className="xl:col-span-2 min-w-0">
              <SelectField
                options={[
                  { value: "custom", label: "Custom range" },
                  { value: "last7", label: "Last 7 days" },
                  { value: "last30", label: "Last 30 days" },
                  { value: "quarter", label: "This quarter" },
                ]}
                value={quickRangeFilter}
                onChange={(e) => applyQuickRange(e.target.value as "custom" | "last7" | "last30" | "quarter")}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-3 min-w-[220px]">
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDateFilter, toDateFilter)}
                onApply={(range) =>
                  updateFilters({
                    ...toFilterDates(range),
                    quick_range: "custom",
                    page: 1,
                  })
                }
                triggerClassName="h-11 w-full justify-start text-left font-normal"
              />
            </div>
            <div className="xl:col-span-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Min amount"
                value={minAmountFilter}
                onChange={(e) => updateFilters({ min_amount: e.target.value, page: 1 })}
                aria-label="Minimum amount"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Max amount"
                value={maxAmountFilter}
                onChange={(e) => updateFilters({ max_amount: e.target.value, page: 1 })}
                aria-label="Maximum amount"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {chargebacks.length === 0 ? (
            <EmptyState title="No chargebacks" description="Chargebacks will appear here" />
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="min-w-[180px]">Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="whitespace-nowrap">Sale Date</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead className="whitespace-nowrap">Chargeback Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  {canCreate && <TableHead className="min-w-[170px] text-right whitespace-nowrap">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargebacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell className="font-medium">
                      {cb.sale?.id ? (
                        <div className="flex flex-col">
                          <Link href={`/dashboard/sales/${cb.sale.id}`} className="text-foreground hover:underline">
                            {cb.sale?.customer_name || "N/A"}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">{cb.sale?.customer_email || ""}</span>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell className="min-w-[180px]">{cb.sale?.company_name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize">{cb.sale?.sale_type || "N/A"}</span>
                        <span className="text-[11px] text-muted-foreground uppercase">
                          {cb.sale?.subtype || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {cb.sale?.charged_amount != null ? formatCurrency(Number(cb.sale.charged_amount), currency) : "N/A"}
                    </TableCell>
                    <TableCell>{cb.sale?.agent?.full_name || "N/A"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cb.sale?.created_at ? formatDate(cb.sale.created_at) : "N/A"}
                    </TableCell>
                    <TableCell>{cb.assignee?.full_name || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(cb.date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{cb.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[cb.status] || "default"} className="capitalize">
                        {cb.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[cb.priority]} className="capitalize">
                        {cb.priority}
                      </Badge>
                    </TableCell>
                    {canCreate && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <div className="relative">
                              <SelectField
                                options={CHARGEBACK_STATUSES}
                                value={cb.status}
                                onChange={(e) => handleStatusChange(cb.id, e.target.value)}
                                className="w-[104px] min-w-[104px] pr-10"
                                disabled={updatingId === cb.id || deletingId === cb.id}
                              />
                              {updatingId === cb.id && (
                                <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2">
                                  <Spinner />
                                </span>
                              )}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setActiveCaseId(cb.id)}
                            title="Case details"
                            aria-label="Case details"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <div className="relative">
                                <SelectField
                                  options={CHARGEBACK_PRIORITIES}
                                  value={cb.priority}
                                  onChange={(e) => handlePriorityChange(cb.id, e.target.value)}
                                  className="w-[115px] min-w-[115px]"
                                  disabled={updatingPriorityId === cb.id || deletingId === cb.id}
                                />
                                {updatingPriorityId === cb.id && (
                                  <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2">
                                    <Spinner />
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(cb.id)}
                                disabled={deletingId === cb.id || updatingId === cb.id}
                                title="Delete chargeback"
                                aria-label="Delete chargeback"
                              >
                                {deletingId === cb.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {showForm && <ChargebackFormDialog open onClose={() => setShowForm(false)} />}
      <ChargebackCaseDialog open={!!activeCaseId} chargebackId={activeCaseId} onClose={() => setActiveCaseId(null)} />
    </div>
  );
}
