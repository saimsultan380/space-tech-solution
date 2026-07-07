import { createClient } from "@/lib/supabase/client";
import type { Payslip, AttendanceSettings } from "@/lib/types";
import type { CompanySettings } from "@/lib/actions/company-settings";

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
  pendingSales: number;
  approvedSales: number;
  rejectedSales: number;
  totalChargebacks: number;
  openChargebacks: number;
  pendingLeaves: number;
  todayOnLeave: number;
  conversionRate: string;
}

export interface SalesPerAgentData {
  name: string;
  total: number;
  approved: number;
  revenue: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface AgentDashboardStats {
  totalSales: number;
  todaySales: number;
  todayRevenue: number;
  monthSales: number;
  monthRevenue: number;
  pendingSales: number;
  approvedSales: number;
  rejectedSales: number;
  totalRevenue: number;
  totalCustomers: number;
}

export interface ProcessorDashboardStats {
  totalSales: number;
  salesThisWeek: number;
  weekRecordedRevenue: number;
}

export interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
}

// ── Admin dashboard stats via RPC (single server-side aggregation) ──────────
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("get_dashboard_analytics");

    if (error || !data || (data as any[]).length === 0) {
      return emptyDashboardStats();
    }

    const stats = (data as any[])[0];
    const totalSales = Number(stats.total_sales);
    const rejectedSales = Number(stats.rejected_sales ?? 0);
    const approvedSales = totalSales - rejectedSales;

    return {
      totalSales,
      totalRevenue: Number(stats.total_revenue ?? 0),
      totalCustomers: Number(stats.total_customers ?? 0),
      pendingSales: 0,
      approvedSales,
      rejectedSales,
      totalChargebacks: Number(stats.total_chargebacks ?? 0),
      openChargebacks: Number(stats.open_chargebacks ?? 0),
      pendingLeaves: Number(stats.pending_leaves ?? 0),
      todayOnLeave: Number(stats.today_on_leave ?? 0),
      conversionRate:
        totalSales > 0 ? ((approvedSales / totalSales) * 100).toFixed(1) : "0",
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return emptyDashboardStats();
  }
}

function emptyDashboardStats(): DashboardStats {
  return {
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingSales: 0,
    approvedSales: 0,
    rejectedSales: 0,
    totalChargebacks: 0,
    openChargebacks: 0,
    pendingLeaves: 0,
    todayOnLeave: 0,
    conversionRate: "0",
  };
}

// ── Sales per agent via RPC ───────────────────────────────────────────────────
export async function getSalesPerAgent(): Promise<SalesPerAgentData[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("get_sales_per_agent_stats", {
      target_month: null as unknown as string,
    });

    if (error) {
      console.error("Error fetching sales per agent:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
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

// ── Revenue over time via RPC ─────────────────────────────────────────────────
export async function getRevenueOverTime(
  period: "day" | "week" | "month" = "day",
): Promise<RevenueData[]> {
  const supabase = createClient();

  try {
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

// ── Agent dashboard stats — single RPC call (all aggregations server-side) ───
export async function getAgentDashboardStats(
  month: string,
  agentId?: string,
): Promise<AgentDashboardStats> {
  const supabase = createClient();

  try {
    let userId = agentId;
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user");
      userId = userData.user.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_agent_dashboard_stats",
      { p_agent_id: userId, p_month: month },
    );

    if (error || !data || (data as any[]).length === 0) {
      console.error("Agent dashboard RPC failed, falling back:", error);
      return emptyAgentStats();
    }

    const row = (data as any[])[0];
    return {
      totalSales: Number(row.total_sales ?? 0),
      pendingSales: Number(row.pending_sales ?? 0),
      approvedSales: Number(row.approved_sales ?? 0),
      rejectedSales: Number(row.rejected_sales ?? 0),
      totalRevenue: Number(row.total_revenue ?? 0),
      monthSales: Number(row.month_sales ?? 0),
      monthRevenue: Number(row.month_revenue ?? 0),
      todaySales: Number(row.today_sales ?? 0),
      todayRevenue: Number(row.today_revenue ?? 0),
      totalCustomers: 0,
    };
  } catch (error) {
    console.error("Failed to fetch agent dashboard stats:", error);
    return emptyAgentStats();
  }
}

function emptyAgentStats(): AgentDashboardStats {
  return {
    totalSales: 0,
    todaySales: 0,
    todayRevenue: 0,
    monthSales: 0,
    monthRevenue: 0,
    pendingSales: 0,
    approvedSales: 0,
    rejectedSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  };
}

export async function getAgentRecentSales(
  month: string,
  agentId?: string,
): Promise<
  Array<{
    id: string;
    company_name: string;
    charged_amount: number;
    created_at: string;
    customer_name: string;
  }>
> {
  const supabase = createClient();

  try {
    let userId = agentId;
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user");
      userId = userData.user.id;
    }

    const { data } = await supabase
      .from("sales")
      .select(
        `id,
        charged_amount,
        created_at,
        customers(name, company)`,
      )
      .eq("agent_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data) return [];

    return data.map((sale: any) => ({
      id: sale.id,
      company_name: sale.customers?.company || "N/A",
      charged_amount: sale.charged_amount,
      created_at: sale.created_at,
      customer_name: sale.customers?.name || "Unknown",
    }));
  } catch (error) {
    console.error("Failed to fetch agent recent sales:", error);
    return [];
  }
}

// ── Processor dashboard stats — single RPC call ──────────────────────────────
export async function getProcessorDashboardStats(): Promise<ProcessorDashboardStats> {
  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_processor_dashboard_stats",
    );

    if (error || !data || (data as any[]).length === 0) {
      console.error("Processor dashboard RPC failed, falling back:", error);
      return { totalSales: 0, salesThisWeek: 0, weekRecordedRevenue: 0 };
    }

    const row = (data as any[])[0];
    return {
      totalSales: Number(row.total_sales ?? 0),
      salesThisWeek: Number(row.sales_this_week ?? 0),
      weekRecordedRevenue: Number(row.week_recorded_revenue ?? 0),
    };
  } catch (error) {
    console.error("Failed to fetch processor dashboard stats:", error);
    return { totalSales: 0, salesThisWeek: 0, weekRecordedRevenue: 0 };
  }
}

// ── Today's attendance — filtered by user and date at DB level ───────────────
export async function getTodayAttendance(
  userId?: string,
): Promise<AttendanceRecord | null> {
  const supabase = createClient();

  try {
    let uid = userId;
    if (!uid) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      uid = userData.user.id;
    }

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("id, check_in, check_out")
      .eq("user_id", uid)
      .eq("date", today)
      .single();

    return data || null;
  } catch (error) {
    console.error("Failed to fetch today attendance:", error);
    return null;
  }
}

// ── Recent payslips — filtered and limited at DB level ───────────────────────
export async function getRecentPayslips(
  limit: number = 5,
  userId?: string,
): Promise<Payslip[]> {
  const supabase = createClient();

  try {
    let uid = userId;
    if (!uid) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      uid = userData.user.id;
    }

    const { data } = await supabase
      .from("payslips")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data as Payslip[]) || [];
  } catch (error) {
    console.error("Failed to fetch recent payslips:", error);
    return [];
  }
}

// ── Attendance settings — single-row lookup ──────────────────────────────────
export async function getAttendanceSettings(): Promise<
  AttendanceSettings & {
    shift_start_12h: string;
    late_after_12h: string;
    shift_end_12h: string;
    checkout_latest_12h: string;
  }
> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from("attendance_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!data) throw new Error("No attendance settings found");

    return { ...data, ...format12HourFields(data) } as AttendanceSettings & {
      shift_start_12h: string;
      late_after_12h: string;
      shift_end_12h: string;
      checkout_latest_12h: string;
    };
  } catch (error) {
    console.error("Failed to fetch attendance settings:", error);
    return defaultAttendanceSettings();
  }
}

function format12Hour(time24: string): string {
  const [h = "0", m = "00"] = time24.split(":");
  const hour = Number(h);
  const minutes = m.slice(0, 2);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
}

function format12HourFields(data: any) {
  return {
    shift_start_12h: format12Hour(data.shift_start_time),
    late_after_12h: format12Hour(data.late_after_time),
    shift_end_12h: format12Hour(data.shift_end_time),
    checkout_latest_12h: format12Hour(data.checkout_latest_time),
  };
}

function defaultAttendanceSettings() {
  return {
    id: 1,
    shift_start_time: "09:00:00",
    late_after_time: "09:15:00",
    shift_end_time: "18:00:00",
    checkout_latest_time: "23:00:00",
    checkout_grace_minutes: 0,
    allow_early_checkout: false,
    early_checkout_minutes: 0,
    notify_after_minutes: 60,
    auto_leave_after_minutes: 240,
    auto_leave_enabled: true,
    auto_leave_type: "casual",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift_start_12h: "09:00 AM",
    late_after_12h: "09:15 AM",
    shift_end_12h: "06:00 PM",
    checkout_latest_12h: "11:00 PM",
  };
}

// ── Company settings — single-row lookup ─────────────────────────────────────
export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    if (!data) throw new Error("No company settings found");

    return data as CompanySettings;
  } catch (error) {
    console.error("Failed to fetch company settings:", error);
    return {
      company_name: "",
      address_line: "",
      contact_email: "",
      logo_url: null,
      shell_bg_color: null,
      shell_text_color: null,
      sidebar_color: null,
      sidebar_text_color: null,
      button_color: null,
      button_text_color: null,
      active_tab_color: null,
      active_tab_text_color: null,
      chat_user_bubble_color: null,
      chat_user_bubble_text_color: null,
      chat_bot_bubble_color: null,
      chat_bot_bubble_text_color: null,
    };
  }
}
