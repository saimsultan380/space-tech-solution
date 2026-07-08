import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardAnalyticsRow {
  total_sales: number;
  rejected_sales: number;
  total_revenue: number;
  total_customers: number;
  total_chargebacks: number;
  open_chargebacks: number;
  total_call_logs: number;
  total_processing_accounts: number;
  pending_leaves: number;
  today_on_leave: number;
}

interface SalesPerAgentRow {
  name: string;
  total: number;
  approved: number;
  revenue: number;
}

interface SalesPerProcessorRow {
  name: string;
  total: number;
  approved: number;
  rejected: number;
}

interface ChargebacksPerEmployeeRow {
  name: string;
  count: number;
}

interface CallLogRow {
  created_by: string;
}

interface ChargebackRpcRow {
  agent_id: string;
  name: string;
  count: number;
}

interface AttendanceRow {
  user_id: string;
  date: string;
}

interface SalesAgentRow {
  agent_id: string;
  status: string;
  agent: { full_name: string } | null;
}

interface AgentSaleRow {
  id: string;
  status: string;
  charged_amount: number;
  created_at: string;
}

interface EmployeeSaleRow {
  agent_id: string;
  status: string;
  charged_amount: number;
  sale_date: string | null;
  created_at: string;
}

interface EmployeeAttendanceRow {
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
}

interface EmployeeUserRow {
  id: string;
  full_name: string;
  role: string;
}

interface WeekSaleRow {
  charged_amount: number;
  status: string;
}

// ─── Query Functions ─────────────────────────────────────────────────────────

export async function getDashboardStats(month?: string) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_dashboard_analytics", {
      month_filter: month || undefined,
    });

    if (error || !data || data.length === 0) {
      return {
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
      };
    }

    const stats = data[0];
    const totalSales = Number(stats.total_sales);
    const approvedSales =
      Number(stats.total_sales) - Number(stats.rejected_sales);

    return {
      totalSales,
      totalRevenue: Number(stats.total_revenue),
      totalCustomers: Number(stats.total_customers),
      pendingSales: 0,
      approvedSales,
      rejectedSales: Number(stats.rejected_sales),
      totalChargebacks: Number(stats.total_chargebacks),
      openChargebacks: Number(stats.open_chargebacks),
      totalCallLogs: Number(stats.total_call_logs),
      totalProcessingAccounts: Number(stats.total_processing_accounts),
      pendingLeaves: Number(stats.pending_leaves),
      todayOnLeave: Number(stats.today_on_leave),
      conversionRate:
        totalSales > 0 ? ((approvedSales / totalSales) * 100).toFixed(1) : "0",
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
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
    };
  }
}

export async function getSalesPerAgent(month?: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_sales_per_agent_stats", {
      target_month: (month || null) as any,
    });

    if (error) {
      console.error("Error fetching sales per agent:", error);
      return [];
    }

    return (data || []).map((row: SalesPerAgentRow) => ({
      name: row.name,
      total: Number(row.total),
      approved: Number(row.approved),
      revenue: Number(row.revenue),
    }));
  } catch (error) {
    console.error("Failed to fetch sales per agent:", error);
    return [];
  }
}

export async function getSalesPerProcessor(month?: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "get_sales_per_processor_stats",
      {
        target_month: (month || null) as any,
      },
    );

    if (error) {
      console.error("Error fetching sales per processor:", error);
      return [];
    }

    return (data || []).map((row: SalesPerProcessorRow) => ({
      name: row.name,
      total: Number(row.total),
      approved: Number(row.approved),
      rejected: Number(row.rejected),
    }));
  } catch (error) {
    console.error("Failed to fetch sales per processor:", error);
    return [];
  }
}

export async function getRevenueOverTime(
  period: "day" | "week" | "month" = "day",
) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_revenue_over_time", {
      period_type: period,
    });

    if (error || !data) return [];

    return (data as Array<{ date: string; revenue: number }>).map((row) => ({
      date: row.date,
      revenue: Number(row.revenue),
    }));
  } catch (error) {
    console.error("Failed to fetch revenue over time:", error);
    return [];
  }
}

export async function getChargebacksPerEmployee(month?: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "get_chargebacks_per_employee_stats",
      {
        target_month: (month || null) as any,
      },
    );

    if (error) {
      console.error("Error fetching chargebacks per employee:", error);
      return [];
    }

    return (data || []).map((row: ChargebacksPerEmployeeRow) => ({
      name: row.name,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error("Failed to fetch chargebacks per employee:", error);
    return [];
  }
}

export async function getAttendanceVsPerformance(month?: string) {
  try {
    const supabase = createClient();
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Single DB-level aggregation via RPC — replaces 2 wide browser queries
    const { data, error } = await (supabase as any).rpc(
      "get_attendance_vs_performance",
      { p_month: targetMonth },
    );

    if (error) {
      console.error("get_attendance_vs_performance RPC error:", error);
      return [];
    }

    return ((data as any[]) || []).map((row: any) => ({
      name: String(row.name || "Unknown"),
      attendance_days: Number(row.attendance_days ?? 0),
      approved_sales: Number(row.approved_sales ?? 0),
    }));
  } catch (error) {
    console.error("Failed to fetch attendance vs performance:", error);
    return [];
  }
}

export async function getEmployeeMonthlyStats(month?: string) {
  try {
    const supabase = createClient();
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Single DB-level aggregation via RPC — replaces 5 separate browser queries
    // and eliminates O(users × rows) in-memory JS aggregation
    const { data, error } = await (supabase as any).rpc(
      "get_employee_monthly_stats",
      { p_month: targetMonth },
    );

    if (error) {
      console.error("get_employee_monthly_stats RPC error:", error);
      return [];
    }

    return ((data as any[]) || []).map((row: any) => ({
      id: String(row.id),
      name: String(row.full_name || ""),
      role: String(row.role || ""),
      totalSales: Number(row.total_sales ?? 0),
      approvedSales: Number(row.approved_sales ?? 0),
      rejectedSales: Number(row.rejected_sales ?? 0),
      revenue: Number(row.revenue ?? 0),
      daysPresent: Number(row.days_present ?? 0),
      totalHours: Number(row.total_hours ?? 0),
      callLogResponses: Number(row.call_log_responses ?? 0),
      chargebacks: Number(row.chargebacks ?? 0),
      chargebackRatio: Number(row.chargeback_ratio ?? 0),
    }));
  } catch (error) {
    console.error("Failed to fetch employee monthly stats:", error);
    return [];
  }
}
