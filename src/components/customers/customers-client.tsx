"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { TableDataExport } from "@/components/ui/table-data-export";
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerButton } from "./delete-customer-button";
import { formatDate } from "@/lib/utils";
import { dismissProcessorCallLogsDashboardCta } from "@/lib/nav-access";
import type { UserRole } from "@/lib/types";
import { BarChart3, ChevronDown, ChevronUp, Filter, PieChart as PieChartIcon, Plus, Search, Eye, Users } from "lucide-react";
import Link from "next/link";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { DropdownRangeDatePicker, toDateRangeFromFilters, toFilterDates } from "@/components/ui/dropdown-range-date-picker";
import { StatCard } from "@/components/ui/stat-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "next-themes";

interface CustomersClientProps {
  customersResponse: {
    data: any[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userRole: UserRole;
}

export function CustomersClient({
  customersResponse,
  userRole,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [agentFilterOpen, setAgentFilterOpen] = useState(false);
  const [agentFilterSearch, setAgentFilterSearch] = useState("");
  const [agentFilterValue, setAgentFilterValue] = useState<string>("");
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (userRole === "processor") {
      dismissProcessorCallLogsDashboardCta();
    }
  }, [userRole]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: customers,
    count,
    page,
    totalPages,
    pageSize,
  } = customersResponse;

  const updateFilters = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") {
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

  const { inputRef, inputValue: searchInput, onInputChange, urlValue: urlSearch } =
    useDebouncedUrlSearchInput(searchParams, updateFilters);

  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";

  /** Super admin, sales agents, and processors (when given Call Logs access) use full list management UI. */
  const canManageCallLogs =
    userRole === "super_admin" ||
    userRole === "sales_agent" ||
    userRole === "processor";

  const agentOptions = useMemo(() => {
    const unique = new Map<string, string>();
    customers.forEach((c) => {
      const label = String(c.created_by_user?.full_name || "").trim();
      if (!label) return;
      unique.set(label.toLowerCase(), label);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filteredAgentOptions = useMemo(() => {
    const q = agentFilterSearch.trim().toLowerCase();
    if (!q) return agentOptions;
    return agentOptions.filter((name) => name.toLowerCase().includes(q));
  }, [agentFilterSearch, agentOptions]);

  const visibleCustomers = useMemo(() => {
    const chosen = agentFilterValue.trim().toLowerCase();
    if (!chosen) return customers;
    return customers.filter((c) =>
      String(c.created_by_user?.full_name || "")
        .trim()
        .toLowerCase()
        .includes(chosen)
    );
  }, [customers, agentFilterValue]);

  const exportRows = visibleCustomers.map((c) => [
    c.name,
    c.email,
    c.phone,
    c.dob ? formatDate(c.dob) : "-",
    c.recent_note || "-",
    c.created_by_user?.full_name || "-",
    formatDate(c.created_at),
  ]);

  const stats = useMemo(() => {
    const totalResponses = count;
    const uniqueAgents = new Set(
      visibleCustomers
        .map((c) => String(c.created_by_user?.full_name || "").trim())
        .filter(Boolean)
    );
    const todayLocal = new Date();
    const isSameLocalDay = (d: Date) =>
      d.getFullYear() === todayLocal.getFullYear() &&
      d.getMonth() === todayLocal.getMonth() &&
      d.getDate() === todayLocal.getDate();
    const callsToday = visibleCustomers.filter((c) => {
      const date = new Date(c.created_at);
      return !Number.isNaN(date.getTime()) && isSameLocalDay(date);
    }).length;
    return {
      totalResponses,
      totalAgents: uniqueAgents.size,
      callsToday,
      filteredOnPage: visibleCustomers.length,
    };
  }, [count, visibleCustomers]);

  const pieData = useMemo(() => {
    const byAgent = new Map<string, number>();
    customers.forEach((c) => {
      const name = String(c.created_by_user?.full_name || "Unknown").trim() || "Unknown";
      byAgent.set(name, (byAgent.get(name) || 0) + 1);
    });
    return Array.from(byAgent.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [customers]);

  const isDark = mounted && theme === "dark";
  const pieLabelFill = isDark ? "#E2E8F0" : "#0F172A";
  const pieTooltipBg = isDark ? "#111827" : "#FFFFFF";
  const pieTooltipBorder = isDark ? "#374151" : "#E2E8F0";
  const pieTooltipText = isDark ? "#E2E8F0" : "#0F172A";
  const pieColors = [
    "#3B82F6",
    "#10B981",
    "#A855F7",
    "#F59E0B",
    "#F43F5E",
    "#06B6D4",
    "#64748B",
    "#6366F1",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Call Logs Responses</h1>
          <p className="text-muted-foreground">
            Manage your call logs responses database
          </p>
        </div>
        <div className="flex w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-2 lg:w-auto lg:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChart((s) => !s)}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <PieChartIcon className="h-4 w-4" /> {showChart ? "Hide Chart" : "Show Chart"}
            {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <TableDataExport
            filenameBase="call-logs-responses"
            headers={["Name", "Email", "Phone", "DOB", "Recent Note", "Agent Name", "Created"]}
            rows={exportRows}
            disabled={visibleCustomers.length === 0}
            className="w-full sm:w-auto [&_button]:min-h-11 [&_button]:flex-1 sm:[&_button]:flex-initial sm:[&_button]:min-h-9"
          />
          {canManageCallLogs && (
            <Button
              onClick={() => setShowForm(true)}
              className="h-11 w-full shrink-0 whitespace-nowrap sm:h-9 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Add Call Log Response
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Responses"
          value={stats.totalResponses}
          description="All time"
          icon={<Users className="h-5 w-5" />}
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Total Agents"
          value={stats.totalAgents}
          description="On this page"
          icon={<Users className="h-5 w-5" />}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Calls Today"
          value={stats.callsToday}
          description="On this page"
          icon={<BarChart3 className="h-5 w-5" />}
          colorClass="bg-violet-500"
        />
        <StatCard
          title="Visible Rows"
          value={stats.filteredOnPage}
          description={agentFilterValue ? "Filtered" : "Current page"}
          icon={<Filter className="h-5 w-5" />}
          colorClass="bg-amber-500"
        />
      </div>

      <div
        className={
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out " +
          (showChart ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="min-h-0 overflow-hidden">
          <Card>
            <CardHeader className="space-y-0 pb-4 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">Distribution</div>
                  <div className="text-sm text-muted-foreground">Call logs by agent</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          name && percent !== undefined && percent >= 0.08 ? `${name} ${Math.round(percent * 100)}%` : ""
                        }
                        style={{ fill: pieLabelFill }}
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: pieTooltipBg,
                          border: `1px solid ${pieTooltipBorder}`,
                          borderRadius: "10px",
                          color: pieTooltipText,
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "12px",
                          color: isDark ? "#CBD5E1" : "#475569",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-0 pb-4 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search call logs responses..."
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="h-11 pl-10 sm:h-11"
                  aria-label="Search call logs responses"
                />
              </div>
              <Popover open={agentFilterOpen} onOpenChange={setAgentFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 w-full justify-between sm:h-11 sm:w-[260px]"
                  >
                    <span className="truncate">
                      {agentFilterValue ? agentFilterValue : "Filter by agent"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(90vw,320px)] p-3">
                  <div className="space-y-2">
                    <Input
                      value={agentFilterSearch}
                      onChange={(e) => setAgentFilterSearch(e.target.value)}
                      placeholder="Search agent..."
                      className="h-10"
                    />
                    <div className="max-h-56 overflow-auto rounded-md border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setAgentFilterValue("");
                          setAgentFilterOpen(false);
                        }}
                        className={
                          "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted " +
                          (!agentFilterValue ? "bg-muted" : "")
                        }
                      >
                        <span className="truncate">All agents</span>
                      </button>
                      {filteredAgentOptions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setAgentFilterValue(name);
                            setAgentFilterOpen(false);
                          }}
                          className={
                            "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted " +
                            (agentFilterValue === name ? "bg-muted" : "")
                          }
                        >
                          <span className="truncate">{name}</span>
                        </button>
                      ))}
                      {filteredAgentOptions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No agents found</div>
                      )}
                    </div>
                    {(agentFilterValue || agentFilterSearch) && (
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAgentFilterValue("");
                            setAgentFilterSearch("");
                          }}
                          className="h-9"
                        >
                          Clear
                        </Button>
                        <p className="text-xs text-muted-foreground">{visibleCustomers.length} visible</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDateFilter, toDateFilter)}
                onApply={(range) => updateFilters({ ...toFilterDates(range), page: 1 })}
                triggerClassName="h-11 w-full justify-start text-left font-normal sm:w-[260px]"
              />
            </div>
            <p className="shrink-0 text-sm text-muted-foreground md:max-w-[min(100%,14rem)] md:text-right">
              {count} call log response{count !== 1 ? "s" : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {visibleCustomers.length === 0 ? (
            <EmptyState
              title="No call logs responses found"
              description={
                urlSearch || fromDateFilter || toDateFilter
                  ? "Try adjusting your search or created date filter"
                  : "Add your first call log response to get started"
              }
              action={
                canManageCallLogs && !urlSearch && !fromDateFilter && !toDateFilter ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Call Log Response
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Recent Note</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageCallLogs && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/call-logs-responses/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>
                        {customer.dob ? formatDate(customer.dob) : "-"}
                      </TableCell>
                      <TableCell>
                        {customer.recent_note ? (
                          <span
                            className="block max-w-[340px] truncate text-sm text-muted-foreground"
                            title={customer.recent_note}
                          >
                            {customer.recent_note}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{customer.created_by_user?.full_name || "-"}</TableCell>
                      <TableCell>{formatDate(customer.created_at)}</TableCell>
                      {canManageCallLogs && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/call-logs-responses/${customer.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <CustomerFormDialog customer={customer} />
                            <DeleteCustomerButton
                              id={customer.id}
                              name={customer.name}
                            />
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

      {showForm && (
        <CustomerFormDialog open onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
