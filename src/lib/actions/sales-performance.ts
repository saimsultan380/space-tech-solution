/**
 * Sales Performance Actions
 *
 * This module provides server actions for retrieving and calculating
 * sales performance metrics, leaderboards, and analytics data.
 */

"use server";

import { createClient, createClientUncached } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import type { SaleStatus, SaleType, SaleSubtype } from "@/lib/types";

// Database response types
interface SaleRecord {
  id: string;
  status: SaleStatus;
  charged_amount: number;
  sale_type: SaleType;
  subtype: SaleSubtype;
  created_at: string;
}

interface UserRecord {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
}

interface ChargebackRecord {
  id: string;
  sale: {
    agent_id: string;
  };
}

interface SalesNotificationRecord {
  id: string;
  charged_amount: number;
  agent: {
    full_name: string;
  } | null;
  created_at: string;
  company_name: string;
}

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

/**
 * Internal DB function for agent performance stats. Requires userId only.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getAgentPerformanceStatsDB(userId: string) {
  try {
    const supabase = createClientUncached();
    const targetAgentId = userId;

    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
    const quarterStart = `${today.getFullYear()}-${String(quarterMonth + 1).padStart(2, "0")}-01`;

    const [allSalesRes, monthSalesRes, quarterSalesRes, chargebackRes] =
      await Promise.all([
        supabase
          .from("sales")
          .select("id, status, charged_amount, sale_type, subtype, created_at")
          .eq("agent_id", targetAgentId)
          .limit(1000),
        supabase
          .from("sales")
          .select("id, status, charged_amount")
          .eq("agent_id", targetAgentId)
          .gte("created_at", `${monthStart}T00:00:00`)
          .limit(500),
        supabase
          .from("sales")
          .select("id, status, charged_amount")
          .eq("agent_id", targetAgentId)
          .gte("created_at", `${quarterStart}T00:00:00`)
          .limit(500),
        supabase
          .from("chargebacks")
          .select("id, sale:sales!inner(agent_id)")
          .eq("sale.agent_id", targetAgentId),
      ]);

    // Check for errors
    if (allSalesRes.error)
      throw new Error(`Failed to fetch sales: ${allSalesRes.error.message}`);
    if (monthSalesRes.error)
      throw new Error(
        `Failed to fetch monthly sales: ${monthSalesRes.error.message}`,
      );
    if (quarterSalesRes.error)
      throw new Error(
        `Failed to fetch quarterly sales: ${quarterSalesRes.error.message}`,
      );
    if (chargebackRes.error)
      throw new Error(
        `Failed to fetch chargebacks: ${chargebackRes.error.message}`,
      );

    const allSales = allSalesRes.data || [];
    const monthSales = monthSalesRes.data || [];
    const quarterSales = quarterSalesRes.data || [];

    const approved = (allSales as any[]).filter((s) => s.status !== "rejected");
    const monthApproved = (monthSales as any[]).filter(
      (s) => s.status !== "rejected",
    );
    const quarterApproved = (quarterSales as any[]).filter(
      (s) => s.status !== "rejected",
    );

    const totalRevenue = approved.reduce(
      (sum: number, s: any) => sum + Number(s.charged_amount),
      0,
    );
    const monthRevenue = monthApproved.reduce(
      (sum: number, s: any) => sum + Number(s.charged_amount),
      0,
    );
    const quarterRevenue = quarterApproved.reduce(
      (sum: number, s: any) => sum + Number(s.charged_amount),
      0,
    );

    const monthTarget = 30;
    const monthRevenueTarget = 50000;
    const quarterTarget = 90;
    const quarterRevenueTarget = 150000;

    const monthPct = Math.min(
      100,
      Math.round((monthSales.length / monthTarget) * 100),
    );
    const monthRevPct = Math.min(
      100,
      Math.round((monthRevenue / monthRevenueTarget) * 100),
    );
    const quarterPct = Math.min(
      100,
      Math.round((quarterSales.length / quarterTarget) * 100),
    );
    const quarterRevPct = Math.min(
      100,
      Math.round((quarterRevenue / quarterRevenueTarget) * 100),
    );

    const getStatus = (
      pct: number,
    ): "on_target" | "at_risk" | "below_target" => {
      if (pct >= 70) return "on_target";
      if (pct >= 40) return "at_risk";
      return "below_target";
    };

    const targets: PerformanceTarget[] = [
      {
        label: "Monthly Sales",
        current: monthSales.length,
        target: monthTarget,
        percentage: monthPct,
        status: getStatus(monthPct),
      },
      {
        label: "Monthly Revenue",
        current: monthRevenue,
        target: monthRevenueTarget,
        percentage: monthRevPct,
        status: getStatus(monthRevPct),
      },
      {
        label: "Quarterly Sales",
        current: quarterSales.length,
        target: quarterTarget,
        percentage: quarterPct,
        status: getStatus(quarterPct),
      },
      {
        label: "Quarterly Revenue",
        current: quarterRevenue,
        target: quarterRevenueTarget,
        percentage: quarterRevPct,
        status: getStatus(quarterRevPct),
      },
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
      conversionRate:
        allSales.length > 0
          ? Math.round((approved.length / allSales.length) * 100)
          : 0,
      targets,
    };
  } catch (error) {
    console.error("Error fetching agent performance stats:", error);
    throw new Error("Failed to fetch agent performance statistics");
  }
}

/**
 * Internal DB function for monthly sales trends. Requires userId only.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getAgentMonthlySalesTrendsDB(
  userId: string,
): Promise<MonthlySalesTrend[]> {
  try {
    const supabase = createClientUncached();
    const targetAgentId = userId;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("sales")
      .select("charged_amount, status, created_at")
      .eq("agent_id", targetAgentId)
      .gte("created_at", `${startDate}T00:00:00`)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sales trends: ${error.message}`);
    }

    const monthMap = new Map<string, { sales: number; revenue: number }>();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize the last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { sales: 0, revenue: 0 });
    }

    (data || []).forEach((sale: any) => {
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
        label: monthNames[parseInt(m, 10) - 1],
        sales: data.sales,
        revenue: data.revenue,
      };
    });
  } catch (error) {
    console.error("Error fetching monthly sales trends:", error);
    throw new Error("Failed to fetch monthly sales trends");
  }
}

/**
 * Internal DB function for deal categories. Requires userId only.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getAgentDealCategoriesDB(
  userId: string,
): Promise<DealCategoryBreakdown[]> {
  try {
    const supabase = createClientUncached();
    const targetAgentId = userId;

    const { data, error } = await supabase
      .from("sales")
      .select("sale_type, subtype")
      .eq("agent_id", targetAgentId)
      .neq("status", "rejected");

    if (error) {
      throw new Error(`Failed to fetch deal categories: ${error.message}`);
    }

    const catMap = new Map<string, number>();
    (data || []).forEach((sale: any) => {
      const type =
        sale.sale_type.charAt(0).toUpperCase() + sale.sale_type.slice(1);
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
  } catch (error) {
    console.error("Error fetching deal categories:", error);
    throw new Error("Failed to fetch deal categories");
  }
}

/**
 * Internal DB function for revenue over time. Requires userId only.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getAgentRevenueOverTimeDB(
  userId: string,
): Promise<Array<{ date: string; revenue: number }>> {
  try {
    const supabase = createClientUncached();
    const targetAgentId = userId;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("sales")
      .select("charged_amount, created_at")
      .eq("agent_id", targetAgentId)
      .neq("status", "rejected")
      .gte("created_at", `${startDate}T00:00:00`)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch revenue over time: ${error.message}`);
    }

    const weekMap = new Map<string, number>();
    (data || []).forEach(
      (sale: { charged_amount: number; created_at: string }) => {
        const d = new Date(sale.created_at);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        weekMap.set(key, (weekMap.get(key) || 0) + Number(sale.charged_amount));
      },
    );

    return Array.from(weekMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching revenue over time:", error);
    throw new Error("Failed to fetch revenue over time");
  }
}

/**
 * Internal DB function for sales leaderboard.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getSalesLeaderboardDB(): Promise<LeaderboardEntry[]> {
  try {
    const supabase = createClientUncached();

    // Try to use the RPC function first
    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "get_sales_leaderboard",
    );
    if (!rpcError && Array.isArray(rpcRows)) {
      return (rpcRows as Array<Record<string, unknown>>).map((r) => ({
        agent_id: String(r.agent_id),
        agent_name: String(r.agent_name ?? "Unknown"),
        avatar_url: (r.avatar_url as string | null) ?? null,
        total_sales: Number(r.total_sales ?? 0),
        approved_sales: Number(r.approved_sales ?? 0),
        rejected_sales: Number(r.rejected_sales ?? 0),
        revenue: Number(r.revenue ?? 0),
        chargebacks: Number(r.chargebacks ?? 0),
        conversion_rate: Number(r.conversion_rate ?? 0),
        rank: Number(r.rank ?? 0),
      }));
    }

    // Fallback to manual calculation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [salesRes, usersRes, chargebackRes] = await Promise.all([
      supabase
        .from("sales")
        .select("agent_id, status, charged_amount")
        .gte("created_at", sixMonthsAgo.toISOString())
        .limit(5000),
      supabase
        .from("users")
        .select("id, full_name, avatar_url, role")
        .eq("role", "sales_agent")
        .eq("is_active", true)
        .limit(200),
      supabase
        .from("chargebacks")
        .select("id, sale:sales!inner(agent_id)")
        .limit(1000),
    ]);

    // Check for errors
    if (salesRes.error)
      throw new Error(`Failed to fetch sales: ${salesRes.error.message}`);
    if (usersRes.error)
      throw new Error(`Failed to fetch users: ${usersRes.error.message}`);
    if (chargebackRes.error)
      throw new Error(
        `Failed to fetch chargebacks: ${chargebackRes.error.message}`,
      );

    const agents = usersRes.data || [];
    const sales = salesRes.data || [];
    const chargebacks = chargebackRes.data || [];

    const cbMap = new Map<string, number>();
    chargebacks.forEach((cb: any) => {
      const sale = cb.sale as { agent_id: string } | null;
      if (sale) {
        cbMap.set(sale.agent_id, (cbMap.get(sale.agent_id) || 0) + 1);
      }
    });

    const entries: LeaderboardEntry[] = agents.map((agent: any) => {
      const agentSales = sales.filter((s: any) => s.agent_id === agent.id);
      const approved = agentSales.filter((s: any) => s.status !== "rejected");
      const revenue = approved.reduce(
        (sum: number, s: any) => sum + Number(s.charged_amount),
        0,
      );

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
        conversion_rate:
          agentSales.length > 0
            ? Math.round((approved.length / agentSales.length) * 100)
            : 0,
      };
    });

    entries.sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.approved_sales - a.approved_sales ||
        a.agent_name.localeCompare(b.agent_name),
    );
    entries.forEach((e, i) => (e.rank = i + 1));

    return entries;
  } catch (error) {
    console.error("Error fetching sales leaderboard:", error);
    throw new Error("Failed to fetch sales leaderboard");
  }
}

/**
 * Internal DB function for recent sales notifications.
 * Creates its own uncached client to avoid cookies() inside cache.
 */
async function _getRecentSalesNotificationsDB(): Promise<SalesNotification[]> {
  try {
    const supabase = createClientUncached();

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, charged_amount, agent:users!sales_agent_id_fkey(full_name), created_at, company_name",
      )
      .gte("created_at", oneDayAgo.toISOString())
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch sales notifications: ${error.message}`);
    }

    const notifications: SalesNotification[] = (data || []).map((sale: any) => {
      const agentName = sale.agent?.full_name || "Unknown";
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
  } catch (error) {
    console.error("Error fetching recent sales notifications:", error);
    throw new Error("Failed to fetch recent sales notifications");
  }
}

// ─── Cached DB Access Functions ───────────────────────────────────────────────
//
// These are the actual cached functions that perform DB queries.
// They only accept serializable primitives (strings, numbers) as parameters.
// Supabase client is created inside to avoid circular reference serialization.
//

const _cachedGetAgentPerformanceStats = unstable_cache(
  (userId: string) => _getAgentPerformanceStatsDB(userId),
  ["agent-perf-stats"],
  { revalidate: 120, tags: ["agent-stats", "sales"] },
);

const _cachedGetAgentMonthlySalesTrends = unstable_cache(
  (userId: string) => _getAgentMonthlySalesTrendsDB(userId),
  ["agent-monthly-trends"],
  { revalidate: 300, tags: ["agent-stats", "sales"] },
);

const _cachedGetAgentDealCategories = unstable_cache(
  (userId: string) => _getAgentDealCategoriesDB(userId),
  ["agent-deal-categories"],
  { revalidate: 300, tags: ["agent-stats", "sales"] },
);

const _cachedGetAgentRevenueOverTime = unstable_cache(
  (userId: string) => _getAgentRevenueOverTimeDB(userId),
  ["agent-revenue-time"],
  { revalidate: 300, tags: ["agent-stats", "sales"] },
);

const _cachedGetSalesLeaderboard = unstable_cache(
  () => _getSalesLeaderboardDB(),
  ["sales-leaderboard"],
  { revalidate: 60, tags: ["leaderboard", "sales"] },
);

const _cachedGetRecentSalesNotifications = unstable_cache(
  () => _getRecentSalesNotificationsDB(),
  ["sales-notifications"],
  { revalidate: 30, tags: ["leaderboard", "sales"] },
);

// ─── Public API Wrappers ──────────────────────────────────────────────────────
//
// These wrappers call requireAuth() and pass only serializable data (user ID)
// to the cached functions. The cached functions then create their own
// Supabase clients.
//

/** Get agent performance stats — handles auth outside cache */
export async function getAgentPerformanceStats(agentId?: string) {
  const user = await requireAuth();
  const targetAgentId = agentId || user.id;
  return _cachedGetAgentPerformanceStats(targetAgentId);
}

/** Get monthly sales trends — handles auth outside cache */
export async function getAgentMonthlySalesTrends(agentId?: string) {
  const user = await requireAuth();
  const targetAgentId = agentId || user.id;
  return _cachedGetAgentMonthlySalesTrends(targetAgentId);
}

/** Get deal categories — handles auth outside cache */
export async function getAgentDealCategories(agentId?: string) {
  const user = await requireAuth();
  const targetAgentId = agentId || user.id;
  return _cachedGetAgentDealCategories(targetAgentId);
}

/** Get revenue over time — handles auth outside cache */
export async function getAgentRevenueOverTime(agentId?: string) {
  const user = await requireAuth();
  const targetAgentId = agentId || user.id;
  return _cachedGetAgentRevenueOverTime(targetAgentId);
}

/** Get sales leaderboard — handles auth outside cache */
export async function getSalesLeaderboard() {
  await requireAuth();
  return _cachedGetSalesLeaderboard();
}

/** Get recent sales notifications — handles auth outside cache */
export async function getRecentSalesNotifications() {
  await requireAuth();
  return _cachedGetRecentSalesNotifications();
}
