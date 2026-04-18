"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  avatar_url: string | null;
  total_sales: number;
  approved_sales: number;
  rejected_sales: number;
  revenue: number;
  chargebacks: number;
}

export interface LeaderboardEntry extends AgentPerformance {
  rank: number;
  conversion_rate: number;
}

export interface MonthlySalesTrend {
  month: string;
  label: string;
  sales: number;
  revenue: number;
}

export interface DealCategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface PerformanceTarget {
  label: string;
  current: number;
  target: number;
  percentage: number;
  status: "on_target" | "at_risk" | "below_target";
}

export interface SalesNotification {
  id: string;
  type: "deal_closed" | "milestone" | "overtaken" | "badge";
  agent_name: string;
  message: string;
  created_at: string;
}

const DEAL_COLORS: Record<string, string> = {
  "Utility - New": "#3B82F6",
  "Utility - Bill": "#10B981",
  "Utility - Premium": "#8B5CF6",
  "Utility - Cancellation": "#F59E0B",
  "Insurance - New": "#EF4444",
  "Insurance - Bill": "#EC4899",
  "Insurance - Premium": "#06B6D4",
  "Insurance - Cancellation": "#F97316",
};

export async function getAgentPerformanceStats(agentId?: string) {
  const user = await requireAuth();
  const supabase = await createClient();
  const targetAgentId = agentId || user.id;

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterStart = `${today.getFullYear()}-${String(quarterMonth + 1).padStart(2, "0")}-01`;

  const [allSalesRes, monthSalesRes, quarterSalesRes, chargebackRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, status, charged_amount, sale_type, subtype, created_at")
      .eq("agent_id", targetAgentId),
    supabase
      .from("sales")
      .select("id, status, charged_amount")
      .eq("agent_id", targetAgentId)
      .gte("created_at", `${monthStart}T00:00:00`),
    supabase
      .from("sales")
      .select("id, status, charged_amount")
      .eq("agent_id", targetAgentId)
      .gte("created_at", `${quarterStart}T00:00:00`),
    supabase
      .from("chargebacks")
      .select("id, sale:sales!inner(agent_id)")
      .eq("sale.agent_id", targetAgentId),
  ]);

  const allSales = allSalesRes.data || [];
  const monthSales = monthSalesRes.data || [];
  const quarterSales = quarterSalesRes.data || [];

  const approved = allSales.filter((s) => s.status !== "rejected");
  const monthApproved = monthSales.filter((s) => s.status !== "rejected");
  const quarterApproved = quarterSales.filter((s) => s.status !== "rejected");

  const totalRevenue = approved.reduce((sum, s) => sum + Number(s.charged_amount), 0);
  const monthRevenue = monthApproved.reduce((sum, s) => sum + Number(s.charged_amount), 0);
  const quarterRevenue = quarterApproved.reduce((sum, s) => sum + Number(s.charged_amount), 0);

  const monthTarget = 30;
  const monthRevenueTarget = 50000;
  const quarterTarget = 90;
  const quarterRevenueTarget = 150000;

  const monthPct = Math.min(100, Math.round((monthSales.length / monthTarget) * 100));
  const monthRevPct = Math.min(100, Math.round((monthRevenue / monthRevenueTarget) * 100));
  const quarterPct = Math.min(100, Math.round((quarterSales.length / quarterTarget) * 100));
  const quarterRevPct = Math.min(100, Math.round((quarterRevenue / quarterRevenueTarget) * 100));

  const getStatus = (pct: number): "on_target" | "at_risk" | "below_target" => {
    if (pct >= 70) return "on_target";
    if (pct >= 40) return "at_risk";
    return "below_target";
  };

  const targets: PerformanceTarget[] = [
    { label: "Monthly Sales", current: monthSales.length, target: monthTarget, percentage: monthPct, status: getStatus(monthPct) },
    { label: "Monthly Revenue", current: monthRevenue, target: monthRevenueTarget, percentage: monthRevPct, status: getStatus(monthRevPct) },
    { label: "Quarterly Sales", current: quarterSales.length, target: quarterTarget, percentage: quarterPct, status: getStatus(quarterPct) },
    { label: "Quarterly Revenue", current: quarterRevenue, target: quarterRevenueTarget, percentage: quarterRevPct, status: getStatus(quarterRevPct) },
  ];

  return {
    totalSales: allSales.length,
    approvedSales: approved.length,
    rejectedSales: allSales.length - approved.length,
    totalRevenue,
    monthSales: monthSales.length,
    monthRevenue,
    quarterSales: quarterSales.length,
    quarterRevenue,
    chargebacks: chargebackRes.data?.length || 0,
    conversionRate: allSales.length > 0 ? Math.round((approved.length / allSales.length) * 100) : 0,
    targets,
  };
}

export async function getAgentMonthlySalesTrends(agentId?: string): Promise<MonthlySalesTrend[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const targetAgentId = agentId || user.id;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("sales")
    .select("charged_amount, status, created_at")
    .eq("agent_id", targetAgentId)
    .gte("created_at", `${startDate}T00:00:00`)
    .order("created_at", { ascending: true });

  const monthMap = new Map<string, { sales: number; revenue: number }>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { sales: 0, revenue: 0 });
  }

  (data || []).forEach((sale) => {
    const d = new Date(sale.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key);
    if (existing) {
      existing.sales += 1;
      if (sale.status !== "rejected") {
        existing.revenue += Number(sale.charged_amount);
      }
    }
  });

  return Array.from(monthMap.entries()).map(([month, data]) => {
    const [, m] = month.split("-");
    return {
      month,
      label: monthNames[parseInt(m) - 1],
      sales: data.sales,
      revenue: data.revenue,
    };
  });
}

export async function getAgentDealCategories(agentId?: string): Promise<DealCategoryBreakdown[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const targetAgentId = agentId || user.id;

  const { data } = await supabase
    .from("sales")
    .select("sale_type, subtype")
    .eq("agent_id", targetAgentId)
    .neq("status", "rejected");

  const catMap = new Map<string, number>();
  (data || []).forEach((sale) => {
    const type = sale.sale_type.charAt(0).toUpperCase() + sale.sale_type.slice(1);
    const sub = sale.subtype.charAt(0).toUpperCase() + sale.subtype.slice(1);
    const key = `${type} - ${sub}`;
    catMap.set(key, (catMap.get(key) || 0) + 1);
  });

  return Array.from(catMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: DEAL_COLORS[name] || "#6B7280",
    }))
    .sort((a, b) => b.value - a.value);
}

export async function getAgentRevenueOverTime(agentId?: string): Promise<Array<{ date: string; revenue: number }>> {
  const user = await requireAuth();
  const supabase = await createClient();
  const targetAgentId = agentId || user.id;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("sales")
    .select("charged_amount, created_at")
    .eq("agent_id", targetAgentId)
    .neq("status", "rejected")
    .gte("created_at", `${startDate}T00:00:00`)
    .order("created_at", { ascending: true });

  const weekMap = new Map<string, number>();
  (data || []).forEach((sale) => {
    const d = new Date(sale.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weekMap.set(key, (weekMap.get(key) || 0) + Number(sale.charged_amount));
  });

  return Array.from(weekMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSalesLeaderboard(): Promise<LeaderboardEntry[]> {
  await requireAuth();
  const supabase = await createClient();

  const [salesRes, usersRes, chargebackRes] = await Promise.all([
    supabase.from("sales").select("agent_id, status, charged_amount"),
    supabase.from("users").select("id, full_name, avatar_url, role").eq("role", "sales_agent").eq("is_active", true),
    supabase.from("chargebacks").select("id, sale:sales!inner(agent_id)"),
  ]);

  const agents = usersRes.data || [];
  const sales = salesRes.data || [];
  const chargebacks = chargebackRes.data || [];

  const cbMap = new Map<string, number>();
  chargebacks.forEach((cb) => {
    const sale = cb.sale as unknown as { agent_id: string } | null;
    if (sale) {
      cbMap.set(sale.agent_id, (cbMap.get(sale.agent_id) || 0) + 1);
    }
  });

  const entries: LeaderboardEntry[] = agents.map((agent) => {
    const agentSales = sales.filter((s) => s.agent_id === agent.id);
    const approved = agentSales.filter((s) => s.status !== "rejected");
    const revenue = approved.reduce((sum, s) => sum + Number(s.charged_amount), 0);

    return {
      agent_id: agent.id,
      agent_name: agent.full_name,
      avatar_url: agent.avatar_url,
      total_sales: agentSales.length,
      approved_sales: approved.length,
      rejected_sales: agentSales.length - approved.length,
      revenue,
      chargebacks: cbMap.get(agent.id) || 0,
      rank: 0,
      conversion_rate: agentSales.length > 0 ? Math.round((approved.length / agentSales.length) * 100) : 0,
    };
  });

  entries.sort((a, b) => b.revenue - a.revenue || b.approved_sales - a.approved_sales);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

export async function getRecentSalesNotifications(): Promise<SalesNotification[]> {
  await requireAuth();
  const supabase = await createClient();

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const { data } = await supabase
    .from("sales")
    .select("id, charged_amount, agent:users!sales_agent_id_fkey(full_name), created_at, company_name")
    .gte("created_at", oneDayAgo.toISOString())
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications: SalesNotification[] = (data || []).map((sale) => {
    const agentName = (sale.agent as unknown as { full_name: string } | null)?.full_name || "Unknown";
    const amount = Number(sale.charged_amount);

    return {
      id: sale.id,
      type: amount >= 5000 ? "milestone" : "deal_closed",
      agent_name: agentName,
      message:
        amount >= 5000
          ? `${agentName} closed a high-value deal worth $${amount.toLocaleString()} with ${sale.company_name}!`
          : `${agentName} closed a deal with ${sale.company_name} for $${amount.toLocaleString()}`,
      created_at: sale.created_at,
    };
  });

  return notifications;
}
