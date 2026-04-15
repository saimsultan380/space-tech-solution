"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner, EmptyState } from "@/components/ui/loading";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { TableDataExportAsync } from "@/components/ui/table-data-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createMarketingEntry,
  updateMarketingEntry,
  deleteMarketingEntry,
  getMarketingEntries,
  type MarketingEntryWithCalculations,
  type MarketingEntryStats,
} from "@/lib/actions/marketing-budget";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { DropdownRangeDatePicker, toDateRangeFromFilters, toFilterDates } from "@/components/ui/dropdown-range-date-picker";
import type { MarketingEntryCampaign } from "@/lib/types";
import {
  Plus,
  Wallet,
  Users,
  ShoppingCart,
  TrendingDown,
  Pencil,
  Trash2,
  BarChart3,
  Search,
} from "lucide-react";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CAMPAIGN_OPTIONS = [
  { value: "energy", label: "Energy" },
  { value: "insurance", label: "Insurance" },
  { value: "telecom", label: "Telecom" },
];

const CAMPAIGN_LABELS: Record<string, string> = {
  energy: "Energy",
  insurance: "Insurance",
  telecom: "Telecom",
};

interface MarketingBudgetClientProps {
  entriesResponse: {
    data: MarketingEntryWithCalculations[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: MarketingEntryStats;
  chartData: {
    budgetVsSales: Array<{ date: string; budget: number; sales: number }>;
    leadsVsConversions: Array<{ date: string; leads: number; conversions: number }>;
    dropRatioTrend: Array<{ date: string; dropRate: number }>;
  };
  filters: {
    startDate: string;
    endDate: string;
    campaign: string;
  };
}

export function MarketingBudgetClient({
  entriesResponse,
  stats,
  chartData,
  filters,
}: MarketingBudgetClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const [isPending, startTransition] = useTransition();

  const { data: entries, count, page, pageSize, totalPages } = entriesResponse;

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MarketingEntryWithCalculations | null>(null);

  const [filterStartDate, setFilterStartDate] = useState(filters.startDate);
  const [filterEndDate, setFilterEndDate] = useState(filters.endDate);
  const [filterCampaign, setFilterCampaign] = useState(filters.campaign);

  useEffect(() => {
    setFilterStartDate(filters.startDate);
    setFilterEndDate(filters.endDate);
    setFilterCampaign(filters.campaign);
  }, [filters.startDate, filters.endDate, filters.campaign]);

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "all") {
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
    useDebouncedUrlSearchInput(searchParams, updateFilters, { paramKey: "q", debounceMs: 350 });

  const applyDashboardFilters = () => {
    updateFilters({
      from: filterStartDate || undefined,
      to: filterEndDate || undefined,
      campaign: filterCampaign === "all" ? undefined : filterCampaign,
    });
  };

  const clearAllFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterCampaign("all");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleDeleteEntry = (id: string) => {
    if (!window.confirm("Delete this entry? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteMarketingEntry(id);
        router.refresh();
      } catch {}
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Marketing Budget Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Track campaign performance, leads, and conversions
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[400px]:flex-row sm:items-center">
          <Button
            onClick={() => {
              setEditingEntry(null);
              setEntryDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Marketing Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(filterStartDate, filterEndDate)}
                onApply={(range) => {
                  const dates = toFilterDates(range);
                  setFilterStartDate(dates.from_date || "");
                  setFilterEndDate(dates.to_date || "");
                }}
                triggerClassName="h-11 w-full justify-start text-left font-normal"
              />
            </div>
            <Select
              id="filter_campaign"
              label="Campaign"
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              options={[{ value: "all", label: "All Campaigns" }, ...CAMPAIGN_OPTIONS]}
            />
            <div className="flex items-end gap-2">
              <Button onClick={applyDashboardFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget, currency)}
          icon={<Wallet className="h-5 w-5" />}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Total Leads"
          value={stats.totalLeads.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales.toLocaleString()}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          title="Drop Rate"
          value={`${stats.avgDropRate}%`}
          icon={<TrendingDown className="h-5 w-5" />}
          color="bg-rose-500/10 text-rose-600"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="marketing_entries_search"
                  ref={inputRef}
                  placeholder="Search marketing entries by campaign…"
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="h-10 pl-10"
                />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground sm:shrink-0 sm:whitespace-nowrap">
                {count} marketing entr{count !== 1 ? "ies" : "y"}
              </CardTitle>
            </div>
            <TableDataExportAsync
              filenameBase="marketing-budget-entries"
              disabled={count === 0}
              className="shrink-0"
              fetchRows={async () => {
                const q = searchParams.get("q")?.trim() || undefined;
                const rowData = await getMarketingEntries({
                  startDate: filters.startDate || undefined,
                  endDate: filters.endDate || undefined,
                  campaign: (filters.campaign || "all") as MarketingEntryCampaign | "all",
                  search: q,
                });
                const headers = [
                  "Date",
                  "Campaign",
                  "Budget",
                  "Calls Landed",
                  "Dropped Calls",
                  "Sales",
                  "Conversion %",
                  "Drop %",
                  "Cost/Lead",
                ];
                const rows = rowData.map((e) => [
                  e.entry_date,
                  CAMPAIGN_LABELS[e.campaign] || e.campaign,
                  formatCurrency(e.budget_assigned, currency),
                  e.calls_landed,
                  e.dropped_calls,
                  e.sales_acquired,
                  `${e.conversion_rate}%`,
                  `${e.drop_rate}%`,
                  formatCurrency(e.cost_per_lead, currency),
                ]);
                return { headers, rows };
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {entries.length === 0 ? (
            <EmptyState
              title="No entries found"
              description={
                urlSearch
                  ? "Try adjusting your search or dashboard filters"
                  : "Add a marketing entry or adjust date range and campaign above"
              }
              action={
                !urlSearch ? (
                  <Button
                    onClick={() => {
                      setEditingEntry(null);
                      setEntryDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Entry
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Calls Landed</TableHead>
                    <TableHead>Dropped Calls</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Conversion %</TableHead>
                    <TableHead>Drop %</TableHead>
                    <TableHead>Cost/Lead</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entry_date)}</TableCell>
                      <TableCell>
                        <CampaignBadge campaign={entry.campaign} />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(entry.budget_assigned, currency)}
                      </TableCell>
                      <TableCell>{entry.calls_landed.toLocaleString()}</TableCell>
                      <TableCell>{entry.dropped_calls.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        {entry.sales_acquired.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.conversion_rate >= 15
                              ? "font-medium text-emerald-600"
                              : entry.conversion_rate >= 10
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }
                        >
                          {entry.conversion_rate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.drop_rate > 15 ? "font-medium text-rose-600" : "text-muted-foreground"
                          }
                        >
                          {entry.drop_rate}%
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(entry.cost_per_lead, currency)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingEntry(entry);
                              setEntryDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Budget vs Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetVsSalesChart data={chartData.budgetVsSales} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Leads vs Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsVsConversionsChart data={chartData.leadsVsConversions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Drop Ratio Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DropRatioTrendChart data={chartData.dropRatioTrend} />
        </CardContent>
      </Card>

      {entryDialogOpen && (
        <EntryFormDialog
          open={entryDialogOpen}
          onClose={() => {
            setEntryDialogOpen(false);
            setEditingEntry(null);
          }}
          entry={editingEntry}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignBadge({ campaign }: { campaign: string }) {
  const variants: Record<string, "default" | "success" | "warning"> = {
    energy: "default",
    insurance: "success",
    telecom: "warning",
  };
  return (
    <Badge variant={variants[campaign] || "default"} className="capitalize">
      {CAMPAIGN_LABELS[campaign] || campaign}
    </Badge>
  );
}

function BudgetVsSalesChart({
  data,
  currency,
}: {
  data: Array<{ date: string; budget: number; sales: number }>;
  currency: string;
}) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#1f2937" : "#e5e7eb";
  const tickFill = isDark ? "#9ca3af" : "#6b7280";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: tickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
          tickFormatter={(value) => {
            const [, month, day] = value.split("-");
            return `${month}/${day}`;
          }}
        />
        <YAxis tick={{ fill: tickFill, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderColor: isDark ? "#374151" : "#e5e7eb",
            borderRadius: 8,
          }}
          formatter={(value, name) => [
            name === "budget" ? formatCurrency(Number(value || 0), currency) : value,
            name === "budget" ? "Budget" : "Sales",
          ]}
        />
        <Legend />
        <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Budget" />
        <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LeadsVsConversionsChart({
  data,
}: {
  data: Array<{ date: string; leads: number; conversions: number }>;
}) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#1f2937" : "#e5e7eb";
  const tickFill = isDark ? "#9ca3af" : "#6b7280";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: tickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
          tickFormatter={(value) => {
            const [, month, day] = value.split("-");
            return `${month}/${day}`;
          }}
        />
        <YAxis tick={{ fill: tickFill, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderColor: isDark ? "#374151" : "#e5e7eb",
            borderRadius: 8,
          }}
        />
        <Legend />
        <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Leads" />
        <Bar dataKey="conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Conversions" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DropRatioTrendChart({ data }: { data: Array<{ date: string; dropRate: number }> }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#1f2937" : "#e5e7eb";
  const tickFill = isDark ? "#9ca3af" : "#6b7280";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: tickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
          tickFormatter={(value) => {
            const [, month, day] = value.split("-");
            return `${month}/${day}`;
          }}
        />
        <YAxis
          tick={{ fill: tickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderColor: isDark ? "#374151" : "#e5e7eb",
            borderRadius: 8,
          }}
          formatter={(value) => [`${value}%`, "Drop Rate"]}
        />
        <Line
          type="monotone"
          dataKey="dropRate"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: "#ef4444", strokeWidth: 2 }}
          name="Drop Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EntryFormDialog({
  open,
  onClose,
  entry,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  entry: MarketingEntryWithCalculations | null;
  onSaved: () => void;
}) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    entry_date: entry?.entry_date || new Date().toISOString().slice(0, 10),
    campaign: entry?.campaign || ("energy" as MarketingEntryCampaign),
    budget_assigned: entry ? String(entry.budget_assigned) : "",
    calls_landed: entry ? String(entry.calls_landed) : "",
    dropped_calls: entry ? String(entry.dropped_calls) : "",
    sales_acquired: entry ? String(entry.sales_acquired) : "",
  });

  const callsLanded = Number(form.calls_landed || 0);
  const droppedCalls = Number(form.dropped_calls || 0);
  const salesAcquired = Number(form.sales_acquired || 0);
  const budgetAssigned = Number(form.budget_assigned || 0);

  const conversionRate = callsLanded > 0 ? ((salesAcquired / callsLanded) * 100).toFixed(2) : "0.00";
  const dropRate = callsLanded > 0 ? ((droppedCalls / callsLanded) * 100).toFixed(2) : "0.00";
  const costPerLead = callsLanded > 0 ? (budgetAssigned / callsLanded).toFixed(2) : "0.00";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const payload = {
          entry_date: form.entry_date,
          campaign: form.campaign as MarketingEntryCampaign,
          budget_assigned: Number(form.budget_assigned || 0),
          calls_landed: Number(form.calls_landed || 0),
          dropped_calls: Number(form.dropped_calls || 0),
          sales_acquired: Number(form.sales_acquired || 0),
        };
        if (entry?.id) {
          await updateMarketingEntry(entry.id, payload);
        } else {
          await createMarketingEntry(payload);
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save entry");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{entry ? "Edit Marketing Entry" : "Add Marketing Entry"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="entry_date"
          label="Date"
          type="date"
          value={form.entry_date}
          onChange={(e) => setForm((prev) => ({ ...prev, entry_date: e.target.value }))}
          required
        />

        <Input
          id="budget_assigned"
          label="Budget Assigned"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter budget amount"
          value={form.budget_assigned}
          onChange={(e) => setForm((prev) => ({ ...prev, budget_assigned: e.target.value }))}
          required
        />

        <Select
          id="campaign"
          label="Campaign"
          value={form.campaign}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, campaign: e.target.value as MarketingEntryCampaign }))
          }
          options={CAMPAIGN_OPTIONS}
          required
        />

        <Input
          id="calls_landed"
          label="Calls Landed / Leads"
          type="number"
          min="0"
          placeholder="Number of calls/leads"
          value={form.calls_landed}
          onChange={(e) => setForm((prev) => ({ ...prev, calls_landed: e.target.value }))}
          required
        />

        <Input
          id="dropped_calls"
          label="Dropped Calls"
          type="number"
          min="0"
          placeholder="Number of dropped calls"
          value={form.dropped_calls}
          onChange={(e) => setForm((prev) => ({ ...prev, dropped_calls: e.target.value }))}
          required
        />

        <Input
          id="sales_acquired"
          label="Sales Acquired"
          type="number"
          min="0"
          placeholder="Number of sales"
          value={form.sales_acquired}
          onChange={(e) => setForm((prev) => ({ ...prev, sales_acquired: e.target.value }))}
          required
        />

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Auto Calculations</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Conversion %</p>
              <p className="font-semibold text-emerald-600">{conversionRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Drop %</p>
              <p className="font-semibold text-rose-600">{dropRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost/Lead</p>
              <p className="font-semibold">{costPerLead}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
