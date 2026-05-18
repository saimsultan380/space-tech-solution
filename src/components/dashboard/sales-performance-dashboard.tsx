"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  DollarSign,
  Target,
  Trophy,
  Award,
  Crown,
  Medal,
  ChevronUp,
  Zap,
  Star,
  Bell,
  X,
  ShoppingCart,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "@/components/ui/icons";
import type {
  LeaderboardEntry,
  MonthlySalesTrend,
  DealCategoryBreakdown,
  PerformanceTarget,
  SalesNotification,
} from "@/lib/actions/sales-performance";

interface SalesPerformanceDashboardProps {
  currentUserId: string;
  stats: {
    totalSales: number;
    approvedSales: number;
    rejectedSales: number;
    totalRevenue: number;
    monthSales: number;
    monthRevenue: number;
    quarterSales: number;
    quarterRevenue: number;
    chargebacks: number;
    conversionRate: number;
    targets: PerformanceTarget[];
  };
  monthlyTrends: MonthlySalesTrend[];
  dealCategories: DealCategoryBreakdown[];
  revenueTimeline: Array<{ date: string; revenue: number }>;
  leaderboard: LeaderboardEntry[];
  notifications: SalesNotification[];
}

const STATUS_COLORS = {
  on_target: { bg: "bg-emerald-500", text: "text-emerald-500", bar: "#10B981", light: "bg-emerald-500/10" },
  at_risk: { bg: "bg-amber-500", text: "text-amber-500", bar: "#F59E0B", light: "bg-amber-500/10" },
  below_target: { bg: "bg-red-500", text: "text-red-500", bar: "#EF4444", light: "bg-red-500/10" },
};

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ["text-amber-400", "text-slate-400", "text-amber-600"];

export function SalesPerformanceDashboard({
  currentUserId,
  stats,
  monthlyTrends,
  dealCategories,
  revenueTimeline,
  leaderboard: initialLeaderboard,
  notifications: initialNotifications,
}: SalesPerformanceDashboardProps) {
  const { currency } = useCurrency();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [toasts, setToasts] = useState<SalesNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [allNotifications, setAllNotifications] = useState(initialNotifications);
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((notif: SalesNotification) => {
    setToasts((prev) => {
      if (prev.some((t) => t.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 5);
    });
    setAllNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== notif.id));
    }, 6000);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sales-performance-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales" },
        async (payload) => {
          const newSale = payload.new as { id: string; agent_id: string; charged_amount: number; company_name: string; status: string; created_at: string };
          if (lastProcessedRef.current === newSale.id) return;
          lastProcessedRef.current = newSale.id;

          const isRejected = newSale.status === "rejected";
          const amount = Number(newSale.charged_amount);

          if (!isRejected) {
            const { data: agentData } = await supabase
              .from("users")
              .select("full_name")
              .eq("id", newSale.agent_id)
              .single();

            const agentName = agentData?.full_name || "Unknown";

            addToast({
              id: newSale.id,
              type: amount >= 5000 ? "milestone" : "deal_closed",
              agent_name: agentName,
              message:
                amount >= 5000
                  ? `${agentName} closed a high-value deal worth ${formatCurrency(amount, currency)} with ${newSale.company_name}!`
                  : `${agentName} closed a deal with ${newSale.company_name} for ${formatCurrency(amount, currency)}`,
              created_at: newSale.created_at,
            });
          }

          setLeaderboard((prev) => {
            const updated = prev.map((e) => {
              if (e.agent_id !== newSale.agent_id) return e;
              const isApproved = !isRejected;
              const nextTotalSales = e.total_sales + 1;
              const nextApprovedSales = e.approved_sales + (isApproved ? 1 : 0);
              const nextRejectedSales = e.rejected_sales + (isRejected ? 1 : 0);
              const nextRevenue = e.revenue + (isApproved ? amount : 0);
              return {
                ...e,
                total_sales: nextTotalSales,
                approved_sales: nextApprovedSales,
                rejected_sales: nextRejectedSales,
                revenue: nextRevenue,
                conversion_rate: nextTotalSales > 0 ? Math.round((nextApprovedSales / nextTotalSales) * 100) : 0,
              };
            });
            updated.sort(
              (a, b) =>
                b.revenue - a.revenue ||
                b.approved_sales - a.approved_sales ||
                a.agent_name.localeCompare(b.agent_name),
            );
            updated.forEach((e, i) => (e.rank = i + 1));

            const currentIdx = updated.findIndex((e) => e.agent_id === currentUserId);
            const prevIdx = prev.findIndex((e) => e.agent_id === currentUserId);
            if (currentIdx >= 0 && prevIdx >= 0 && updated[currentIdx].rank < prev[prevIdx].rank) {
              const overtaker = updated.find((e) => e.rank === prev[prevIdx].rank);
              if (overtaker && overtaker.agent_id !== currentUserId) {
                addToast({
                  id: `overtake-${Date.now()}`,
                  type: "overtaken",
                  agent_name: overtaker.agent_name,
                  message: `${overtaker.agent_name} just moved past your position on the leaderboard!`,
                  created_at: new Date().toISOString(),
                });
              }
            }

            return updated;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currency, addToast]);

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#374151" : "#F3F4F6";
  const tickFill = isDark ? "#9CA3AF" : "#6B7280";
  const tooltipBg = isDark ? "#1F2937" : "#FFFFFF";
  const tooltipBorder = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? "#F3F4F6" : "#111827";

  const compact = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 });

  const currentUser = leaderboard.find((e) => e.agent_id === currentUserId);
  const nextRank = currentUser && currentUser.rank > 1
    ? leaderboard.find((e) => e.rank === currentUser.rank - 1)
    : null;
  const salesGapToNext = nextRank ? Math.max(0, nextRank.approved_sales - (currentUser?.approved_sales || 0)) : 0;
  const hasMonthlyData = monthlyTrends.some((m) => m.sales > 0 || m.revenue > 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">Track your progress and compare with your team</p>
          </div>
        </div>
        <button
          onClick={() => setShowNotifPanel(!showNotifPanel)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all self-end sm:self-auto"
        >
          <Bell className="h-5 w-5" />
          {allNotifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
              {allNotifications.length > 99 ? "99+" : allNotifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<ShoppingCart className="h-5 w-5" />} label="Total Sales" value={String(stats.totalSales)} accent="from-blue-500 to-blue-600" />
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Revenue" value={formatCurrency(stats.totalRevenue, currency)} accent="from-emerald-500 to-emerald-600" />
        <KpiCard icon={<Target className="h-5 w-5" />} label="Conversion" value={`${stats.conversionRate}%`} accent="from-violet-500 to-violet-600" />
        <KpiCard icon={<Trophy className="h-5 w-5" />} label="Rank" value={currentUser ? `#${currentUser.rank}` : "—"} accent="from-amber-500 to-amber-600" />
      </div>

      {/* ── Progress Targets ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Performance Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            {stats.targets.map((t) => {
              const colors = STATUS_COLORS[t.status];
              return (
                <div key={t.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", colors.light, colors.text)}>
                      {t.status === "on_target" ? "On Target" : t.status === "at_risk" ? "At Risk" : "Below Target"}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors.bg)}
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.label.includes("Revenue") ? formatCurrency(t.current, currency) : t.current} achieved</span>
                    <span>{t.label.includes("Revenue") ? formatCurrency(t.target, currency) : t.target} target ({t.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Monthly Trends</TabsTrigger>
          <TabsTrigger value="categories"><PieChartIcon className="mr-1.5 h-3.5 w-3.5" />Deal Breakdown</TabsTrigger>
          <TabsTrigger value="revenue"><Activity className="mr-1.5 h-3.5 w-3.5" />Revenue Timeline</TabsTrigger>
        </TabsList>

        {/* Bar Chart - Monthly Sales Trends */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Sales Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasMonthlyData ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                    <XAxis dataKey="label" tick={{ fill: tickFill, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: tickFill }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: tickFill }} tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "10px", color: textColor }}
                      formatter={(value, name) => [name === "revenue" ? formatCurrency(Number(value ?? 0), currency) : value, name === "revenue" ? "Revenue" : "Sales"]}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingBottom: "12px" }} />
                    <Bar yAxisId="left" dataKey="sales" name="Sales" fill="url(#salesBarGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="url(#revenueBarGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pie Chart - Deal Categories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {dealCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={dealCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {dealCategories.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill={textColor}>
                        <tspan x="50%" dy="-0.3em" fontSize="28" fontWeight={700}>
                          {dealCategories.reduce((s, c) => s + c.value, 0)}
                        </tspan>
                        <tspan x="50%" dy="1.6em" fontSize="12" fill="#9CA3AF" fontWeight={500}>
                          Total Deals
                        </tspan>
                      </text>
                      <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "10px", color: textColor }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:flex-col md:items-start">
                    {dealCategories.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                        <span className="text-muted-foreground">({cat.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Area Chart - Revenue Over Time */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueTimeline.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={revenueTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="perfRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: tickFill }}
                      tickLine={false}
                      axisLine={{ stroke: gridStroke }}
                      tickFormatter={(v) => {
                        const parts = v.split("-");
                        return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
                      }}
                    />
                    <YAxis tick={{ fill: tickFill }} tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v)} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value ?? 0), currency), "Revenue"]}
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "10px", color: textColor }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#perfRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Leaderboard ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Sales Leaderboard
            </CardTitle>
            {nextRank && currentUser && salesGapToNext > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                <span>{salesGapToNext} more sale{salesGapToNext !== 1 ? "s" : ""} to beat {nextRank.agent_name}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.agent_id === currentUserId;
              const RankIcon = entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : null;
              const rankColor = entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : "";
              return (
                <div
                  key={entry.agent_id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 transition-all",
                    isCurrentUser ? "bg-primary/8 border-2 border-primary/20 shadow-sm" : "border border-transparent hover:bg-muted/50",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                    {RankIcon ? (
                      <RankIcon className={cn("h-6 w-6", rankColor)} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                    )}
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden">
                    {entry.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatar_url} alt={entry.agent_name} className="h-full w-full object-cover" />
                    ) : (
                      entry.agent_name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold truncate", isCurrentUser && "text-primary")}>
                        {entry.agent_name}
                      </p>
                      {isCurrentUser && (
                        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">YOU</span>
                      )}
                      {entry.rank === 1 && (
                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-400 fill-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.approved_sales} deals &middot; {entry.conversion_rate}% conversion
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(entry.revenue, currency)}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.total_sales} total</p>
                  </div>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No agents found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Sliding Toast Notifications ── */}
      <div className="fixed right-4 top-20 z-50 flex flex-col gap-3 w-80">
        {toasts.map((toast, idx) => (
          <div
            key={toast.id}
            className="animate-slide-in-right rounded-xl border border-border bg-card p-4 shadow-2xl backdrop-blur"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                toast.type === "milestone" ? "bg-amber-500/10 text-amber-500" :
                toast.type === "overtaken" ? "bg-red-500/10 text-red-500" :
                toast.type === "badge" ? "bg-violet-500/10 text-violet-500" :
                "bg-emerald-500/10 text-emerald-500"
              )}>
                {toast.type === "milestone" ? <Star className="h-4 w-4" /> :
                 toast.type === "overtaken" ? <ChevronUp className="h-4 w-4" /> :
                 toast.type === "badge" ? <Award className="h-4 w-4" /> :
                 <TrendingUp className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">{toast.agent_name}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Notification Panel (Slide-over) ── */}
      {showNotifPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowNotifPanel(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl animate-slide-in-right overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              <button onClick={() => setShowNotifPanel(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {allNotifications.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">No recent activity</p>
              ) : (
                allNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      n.type === "milestone" ? "bg-amber-500/10 text-amber-500" :
                      n.type === "overtaken" ? "bg-red-500/10 text-red-500" :
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {n.type === "milestone" ? <Star className="h-4 w-4" /> :
                       n.type === "overtaken" ? <ChevronUp className="h-4 w-4" /> :
                       <TrendingUp className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-foreground">{n.message}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground" suppressHydrationWarning>
                        {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110", accent)}>
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
      <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.06] transition-transform duration-500 group-hover:scale-150", accent)} />
    </div>
  );
}
