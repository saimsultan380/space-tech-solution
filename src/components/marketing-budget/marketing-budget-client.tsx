"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createMarketingCampaign,
  createMarketingDailyCallLog,
  deleteMarketingCampaign,
  recordMarketingBudgetTransaction,
  updateMarketingCampaign,
  upsertMarketingDailyCampaignBudget,
} from "@/lib/actions/marketing-budget";
import type {
  MarketingCampaign,
  MarketingDailyCallLog,
  MarketingDailyCampaignBudget,
  MarketingBudgetTransaction,
} from "@/lib/types";
import {
  Megaphone,
  Plus,
  Wallet,
  Target,
  TrendingUp,
  CalendarRange,
  PauseCircle,
  CircleCheckBig,
  TriangleAlert,
  Trash2,
  Pencil,
} from "lucide-react";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MarketingBudgetClientProps {
  overview: {
    totalBudgetAllocated: number;
    totalSpent: number;
    remainingBudget: number;
    utilizationPercent: number;
    activeCampaigns: number;
    monthlySpendChart: Array<{ date: string; spend: number }>;
  };
  campaigns: Array<
    MarketingCampaign & {
      amount_spent: number;
      remaining_budget: number;
      computed_status: "active" | "paused" | "completed" | "over_budget";
    }
  >;
  users: Array<{ id: string; full_name: string; role: string; email: string }>;
  dailyCallLogs: MarketingDailyCallLog[];
  dailyCampaignBudgets: Array<
    MarketingDailyCampaignBudget & {
      daily_spent: number;
      variance: number;
      status: "within" | "over";
    }
  >;
  monthlyTotals: Array<{ campaign_id: string; campaign_name: string; total_spent: number }>;
  transactions: MarketingBudgetTransaction[];
  month: string;
}

export function MarketingBudgetClient({
  overview,
  campaigns,
  users,
  dailyCallLogs,
  dailyCampaignBudgets,
  monthlyTotals,
  transactions,
  month,
}: MarketingBudgetClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const [isPending, startTransition] = useTransition();

  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<(typeof campaigns)[number] | null>(null);
  const [dailyLogDialogOpen, setDailyLogDialogOpen] = useState(false);
  const [dailyBudgetDialogOpen, setDailyBudgetDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [callLogFilterStart, setCallLogFilterStart] = useState("");
  const [callLogFilterEnd, setCallLogFilterEnd] = useState("");
  const [callLogFilterCampaign, setCallLogFilterCampaign] = useState("all");
  const [callLogFilterAgent, setCallLogFilterAgent] = useState("all");

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const current = new Date();
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(current);
      d.setMonth(current.getMonth() - i);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  const campaignOptions = useMemo(
    () =>
      campaigns.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [campaigns]
  );

  const agentOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.id,
        label: item.full_name,
      })),
    [users]
  );

  const filteredDailyCallLogs = useMemo(() => {
    return dailyCallLogs.filter((row) => {
      if (callLogFilterStart && row.log_date < callLogFilterStart) return false;
      if (callLogFilterEnd && row.log_date > callLogFilterEnd) return false;
      if (callLogFilterCampaign !== "all" && row.campaign_id !== callLogFilterCampaign) return false;
      if (callLogFilterAgent !== "all" && row.user_id !== callLogFilterAgent) return false;
      return true;
    });
  }, [dailyCallLogs, callLogFilterStart, callLogFilterEnd, callLogFilterCampaign, callLogFilterAgent]);

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("month", value);
    router.push(`/dashboard/marketing-budget?${params.toString()}`);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    startTransition(async () => {
      try {
        await deleteMarketingCampaign(campaignId);
        router.refresh();
      } catch {}
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Budget</h1>
          <p className="text-muted-foreground">Campaign budget allocation, call cost tracking, and spend controls</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-[4px] border border-border bg-background px-2 py-2 text-xs text-foreground shadow-sm"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              setEditingCampaign(null);
              setCampaignDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="daily-call-logs">Daily Call Logs Budget</TabsTrigger>
          <TabsTrigger value="daily-campaign-budget">Daily Campaign Budget</TabsTrigger>
          <TabsTrigger value="transactions">Budget Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Total Budget Allocated"
              value={formatCurrency(overview.totalBudgetAllocated, currency)}
              icon={<Wallet className="h-4 w-4" />}
            />
            <SummaryCard
              title="Total Spent"
              value={formatCurrency(overview.totalSpent, currency)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <SummaryCard
              title="Remaining Budget"
              value={formatCurrency(overview.remainingBudget, currency)}
              icon={<Target className="h-4 w-4" />}
            />
            <SummaryCard
              title="Active Campaigns"
              value={overview.activeCampaigns}
              icon={<Megaphone className="h-4 w-4" />}
            />
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">Budget Utilization</p>
                <p className="mt-1 text-2xl font-bold">{overview.utilizationPercent.toFixed(1)}%</p>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, overview.utilizationPercent))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Spend Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlySpendChart data={overview.monthlySpendChart} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned Budget</TableHead>
                    <TableHead>Amount Spent</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="capitalize">{campaign.type}</TableCell>
                      <TableCell>{formatCurrency(Number(campaign.total_budget || 0), currency)}</TableCell>
                      <TableCell>{formatCurrency(Number(campaign.amount_spent || 0), currency)}</TableCell>
                      <TableCell
                        className={campaign.remaining_budget < 0 ? "text-destructive font-semibold" : "font-semibold"}
                      >
                        {formatCurrency(Number(campaign.remaining_budget || 0), currency)}
                      </TableCell>
                      <TableCell>{formatDate(campaign.start_date)}</TableCell>
                      <TableCell>{formatDate(campaign.end_date)}</TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.computed_status} />
                      </TableCell>
                      <TableCell>{campaign.assigned_user?.full_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCampaign(campaign);
                              setCampaignDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-call-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Call Campaign Daily Cost Logs</CardTitle>
                <Button onClick={() => setDailyLogDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Daily Log
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  id="callLogStart"
                  label="Start Date"
                  type="date"
                  value={callLogFilterStart}
                  onChange={(e) => setCallLogFilterStart(e.target.value)}
                />
                <Input
                  id="callLogEnd"
                  label="End Date"
                  type="date"
                  value={callLogFilterEnd}
                  onChange={(e) => setCallLogFilterEnd(e.target.value)}
                />
                <Select
                  id="callLogCampaign"
                  label="Campaign"
                  value={callLogFilterCampaign}
                  onChange={(e) => setCallLogFilterCampaign(e.target.value)}
                  options={[{ value: "all", label: "All Campaigns" }, ...campaignOptions]}
                />
                <Select
                  id="callLogAgent"
                  label="Agent"
                  value={callLogFilterAgent}
                  onChange={(e) => setCallLogFilterAgent(e.target.value)}
                  options={[{ value: "all", label: "All Agents" }, ...agentOptions]}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Calls Made</TableHead>
                    <TableHead>Cost / Call</TableHead>
                    <TableHead>Total Daily Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDailyCallLogs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.log_date)}</TableCell>
                      <TableCell>{item.campaign?.name || "-"}</TableCell>
                      <TableCell>{item.user?.full_name || "-"}</TableCell>
                      <TableCell>{item.calls_made}</TableCell>
                      <TableCell>{formatCurrency(Number(item.cost_per_call || 0), currency)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(item.total_daily_cost || 0), currency)}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="rounded-xl border border-border/60 p-4">
                <p className="mb-3 text-sm font-semibold text-muted-foreground">Running Monthly Total Per Campaign</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {monthlyTotals.map((row) => (
                    <div key={row.campaign_id} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <p className="text-sm font-medium">{row.campaign_name}</p>
                      <p className="text-base font-bold">{formatCurrency(Number(row.total_spent || 0), currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-campaign-budget" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Daily Budget vs Spend</CardTitle>
                <Button onClick={() => setDailyBudgetDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Daily Budget
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Daily Budget Allocated</TableHead>
                    <TableHead>Daily Spent</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyCampaignBudgets.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.budget_date)}</TableCell>
                      <TableCell>{row.campaign?.name || "-"}</TableCell>
                      <TableCell>{formatCurrency(Number(row.daily_budget_allocated || 0), currency)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(row.daily_spent || 0), currency)}</TableCell>
                      <TableCell className={row.variance < 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>
                        {formatCurrency(Number(row.variance || 0), currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === "within" ? "success" : "destructive"}>
                          {row.status === "within" ? "Within Budget" : "Over Budget"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">{row.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Budget Transactions Log</CardTitle>
                <Button onClick={() => setTransactionDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Transaction
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell>{tx.campaign?.name || "-"}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(tx.amount || 0), currency)}</TableCell>
                      <TableCell>{tx.performer?.full_name || "-"}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">{tx.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {campaignDialogOpen && (
        <CampaignDialog
          open={campaignDialogOpen}
          onClose={() => {
            setCampaignDialogOpen(false);
            setEditingCampaign(null);
          }}
          users={users}
          campaign={editingCampaign}
          onSaved={() => router.refresh()}
        />
      )}

      {dailyLogDialogOpen && (
        <DailyLogDialog
          open={dailyLogDialogOpen}
          onClose={() => setDailyLogDialogOpen(false)}
          campaigns={campaigns.filter((item) => item.status === "active")}
          users={users}
          onSaved={() => router.refresh()}
        />
      )}

      {dailyBudgetDialogOpen && (
        <DailyBudgetDialog
          open={dailyBudgetDialogOpen}
          onClose={() => setDailyBudgetDialogOpen(false)}
          campaigns={campaigns}
          onSaved={() => router.refresh()}
        />
      )}

      {transactionDialogOpen && (
        <TransactionDialog
          open={transactionDialogOpen}
          onClose={() => setTransactionDialogOpen(false)}
          campaigns={campaigns}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignStatusBadge({
  status,
}: {
  status: "active" | "paused" | "completed" | "over_budget";
}) {
  if (status === "active") {
    return (
      <Badge variant="success" className="gap-1">
        <CircleCheckBig className="h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge variant="warning" className="gap-1">
        <PauseCircle className="h-3 w-3" />
        Paused
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CalendarRange className="h-3 w-3" />
        Completed
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <TriangleAlert className="h-3 w-3" />
      Over Budget
    </Badge>
  );
}

function MonthlySpendChart({ data, currency }: { data: Array<{ date: string; spend: number }>; currency: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No spend data available</p>;
  }

  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={{ stroke: "#F3F4F6" }}
          tickFormatter={(value) => {
            const [, month, day] = value.split("-");
            return `${month}/${day}`;
          }}
        />
        <YAxis
          tick={{ fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => compact.format(Number(value || 0))}
        />
        <Tooltip formatter={(value) => [formatCurrency(Number(value || 0), currency), "Spend"]} />
        <Bar dataKey="spend" fill="#3B6EF8" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CampaignDialog({
  open,
  onClose,
  users,
  campaign,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  users: Array<{ id: string; full_name: string; role: string }>;
  campaign: (MarketingCampaign & { amount_spent: number; remaining_budget: number; computed_status: string }) | null;
  onSaved: () => void;
}) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: campaign?.name || "",
    type: campaign?.type || "call",
    total_budget: campaign ? String(campaign.total_budget) : "",
    start_date: campaign?.start_date || "",
    end_date: campaign?.end_date || "",
    assigned_to: campaign?.assigned_to || "",
    status: campaign?.status || "active",
    notes: campaign?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const payload = {
          name: form.name,
          type: form.type as "call" | "digital" | "other",
          total_budget: Number(form.total_budget || 0),
          start_date: form.start_date,
          end_date: form.end_date,
          assigned_to: form.assigned_to || null,
          status: form.status as "active" | "paused" | "completed",
          notes: form.notes,
        };
        if (campaign?.id) {
          await updateMarketingCampaign(campaign.id, payload);
        } else {
          await createMarketingCampaign(payload);
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save campaign");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{campaign ? "Edit Campaign" : "New Campaign"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="campaignName"
          label="Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="campaignType"
            label="Type"
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, type: e.target.value as "call" | "digital" | "other" }))
            }
            options={[
              { value: "call", label: "Call" },
              { value: "digital", label: "Digital" },
              { value: "other", label: "Other" },
            ]}
          />
          <Input
            id="campaignBudget"
            label="Total Budget (PKR)"
            type="number"
            min="0"
            value={form.total_budget}
            onChange={(e) => setForm((prev) => ({ ...prev, total_budget: e.target.value }))}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="campaignStartDate"
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
            required
          />
          <Input
            id="campaignEndDate"
            label="End Date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="campaignAssignedTo"
            label="Assigned To"
            value={form.assigned_to}
            onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
            options={[{ value: "", label: "Unassigned" }, ...users.map((user) => ({ value: user.id, label: user.full_name }))]}
          />
          <Select
            id="campaignStatus"
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value as "active" | "paused" | "completed" }))
            }
            options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </div>
        <Textarea
          id="campaignNotes"
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Campaign notes and context"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : campaign ? "Update Campaign" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function DailyLogDialog({
  open,
  onClose,
  campaigns,
  users,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: Array<MarketingCampaign & { amount_spent: number; remaining_budget: number; computed_status: string }>;
  users: Array<{ id: string; full_name: string }>;
  onSaved: () => void;
}) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    campaign_id: campaigns[0]?.id || "",
    user_id: users[0]?.id || "",
    calls_made: "",
    cost_per_call: "",
    notes: "",
  });

  const totalDailyCost = Number(form.calls_made || 0) * Number(form.cost_per_call || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createMarketingDailyCallLog({
          log_date: form.log_date,
          campaign_id: form.campaign_id,
          user_id: form.user_id,
          calls_made: Number(form.calls_made || 0),
          cost_per_call: Number(form.cost_per_call || 0),
          notes: form.notes,
        });
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save daily log");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Add Daily Log</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="logDate"
          label="Date"
          type="date"
          value={form.log_date}
          onChange={(e) => setForm((prev) => ({ ...prev, log_date: e.target.value }))}
          required
        />
        <Select
          id="logCampaign"
          label="Campaign"
          value={form.campaign_id}
          onChange={(e) => setForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
          options={campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
          required
        />
        <Select
          id="logAgent"
          label="Agent"
          value={form.user_id}
          onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
          options={users.map((user) => ({ value: user.id, label: user.full_name }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="callsMade"
            label="Calls Made"
            type="number"
            min="0"
            value={form.calls_made}
            onChange={(e) => setForm((prev) => ({ ...prev, calls_made: e.target.value }))}
            required
          />
          <Input
            id="costPerCall"
            label="Cost Per Call (PKR)"
            type="number"
            min="0"
            step="0.01"
            value={form.cost_per_call}
            onChange={(e) => setForm((prev) => ({ ...prev, cost_per_call: e.target.value }))}
            required
          />
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">Total Daily Cost</p>
          <p className="text-lg font-bold">{formatCurrency(totalDailyCost, "PKR")}</p>
        </div>
        <Textarea
          id="dailyLogNotes"
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Save Log"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function DailyBudgetDialog({
  open,
  onClose,
  campaigns,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: Array<MarketingCampaign & { amount_spent: number; remaining_budget: number; computed_status: string }>;
  onSaved: () => void;
}) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    budget_date: new Date().toISOString().slice(0, 10),
    campaign_id: campaigns[0]?.id || "",
    daily_budget_allocated: "",
    daily_spent_manual: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertMarketingDailyCampaignBudget({
          budget_date: form.budget_date,
          campaign_id: form.campaign_id,
          daily_budget_allocated: Number(form.daily_budget_allocated || 0),
          daily_spent_manual: form.daily_spent_manual ? Number(form.daily_spent_manual) : null,
          notes: form.notes,
        });
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save daily budget");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Add Daily Campaign Budget</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="budgetDate"
          label="Date"
          type="date"
          value={form.budget_date}
          onChange={(e) => setForm((prev) => ({ ...prev, budget_date: e.target.value }))}
          required
        />
        <Select
          id="budgetCampaign"
          label="Campaign"
          value={form.campaign_id}
          onChange={(e) => setForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
          options={campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="dailyAllocated"
            label="Daily Budget Allocated"
            type="number"
            min="0"
            step="0.01"
            value={form.daily_budget_allocated}
            onChange={(e) => setForm((prev) => ({ ...prev, daily_budget_allocated: e.target.value }))}
            required
          />
          <Input
            id="dailySpentManual"
            label="Daily Spent (Manual, optional)"
            type="number"
            min="0"
            step="0.01"
            value={form.daily_spent_manual}
            onChange={(e) => setForm((prev) => ({ ...prev, daily_spent_manual: e.target.value }))}
          />
        </div>
        <Textarea
          id="dailyBudgetNotes"
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Save Daily Budget"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function TransactionDialog({
  open,
  onClose,
  campaigns,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: Array<MarketingCampaign & { amount_spent: number; remaining_budget: number; computed_status: string }>;
  onSaved: () => void;
}) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().slice(0, 10),
    type: "adjustment",
    campaign_id: campaigns[0]?.id || "",
    amount: "",
    note: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await recordMarketingBudgetTransaction({
          transaction_date: form.transaction_date,
          type: form.type as "allocation" | "deduction" | "adjustment",
          campaign_id: form.campaign_id,
          amount: Number(form.amount || 0),
          note: form.note,
        });
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record transaction");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Add Budget Transaction</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="transactionDate"
          label="Date"
          type="date"
          value={form.transaction_date}
          onChange={(e) => setForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
          required
        />
        <Select
          id="transactionType"
          label="Type"
          value={form.type}
          onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          options={[
            { value: "allocation", label: "Allocation" },
            { value: "deduction", label: "Deduction" },
            { value: "adjustment", label: "Adjustment" },
          ]}
          required
        />
        <Select
          id="transactionCampaign"
          label="Campaign"
          value={form.campaign_id}
          onChange={(e) => setForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
          options={campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
          required
        />
        <Input
          id="transactionAmount"
          label="Amount (PKR)"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          required
        />
        <Textarea
          id="transactionNote"
          label="Note"
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Save Transaction"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
