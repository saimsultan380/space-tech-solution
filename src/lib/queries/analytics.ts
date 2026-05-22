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

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  try {
    // Get total sales
    const { data: salesData } = await supabase
      .from("sales")
      .select("id, status, charged_amount, customer_id", { count: "exact" })
      .is("deleted_at", null);

    // Get chargebacks
    const { data: chargebacksData } = await supabase
      .from("chargebacks")
      .select("id, status", { count: "exact" })
      .is("deleted_at", null);

    // Get unique customers
    const { data: customersData } = await supabase
      .from("customers")
      .select("id", { count: "exact" })
      .is("deleted_at", null);

    // Get pending leaves
    const { data: leavesData } = await supabase
      .from("leaves")
      .select("id", { count: "exact" })
      .eq("status", "pending")
      .is("deleted_at", null);

    // Get today's on leave
    const today = new Date().toISOString().split("T")[0];
    const { data: todayLeaveData } = await supabase
      .from("leaves")
      .select("id", { count: "exact" })
      .eq("status", "approved")
      .lte("from_date", today)
      .gte("to_date", today)
      .is("deleted_at", null);

    const stats: DashboardStats = {
      totalSales: salesData?.length || 0,
      totalRevenue:
        salesData?.reduce((sum, sale) => sum + (sale.charged_amount || 0), 0) ||
        0,
      totalCustomers: customersData?.length || 0,
      pendingSales:
        salesData?.filter((s) => s.status === "pending").length || 0,
      approvedSales:
        salesData?.filter((s) => s.status === "approved").length || 0,
      rejectedSales:
        salesData?.filter((s) => s.status === "rejected").length || 0,
      totalChargebacks: chargebacksData?.length || 0,
      openChargebacks:
        chargebacksData?.filter((c) => c.status === "open").length || 0,
      pendingLeaves: leavesData?.length || 0,
      todayOnLeave: todayLeaveData?.length || 0,
      conversionRate: "0",
    };

    return stats;
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
      pendingLeaves: 0,
      todayOnLeave: 0,
      conversionRate: "0",
    };
  }
}

export async function getSalesPerAgent(): Promise<SalesPerAgentData[]> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from("sales")
      .select("agent_id, charged_amount, status, created_by_user(full_name)")
      .is("deleted_at", null);

    if (!data) return [];

    // Group by agent
    const agentMap = new Map<
      string,
      { name: string; total: number; approved: number; revenue: number }
    >();

    data.forEach((sale: any) => {
      const agentName = sale.created_by_user?.full_name || "Unknown";
      if (!agentMap.has(agentName)) {
        agentMap.set(agentName, {
          name: agentName,
          total: 0,
          approved: 0,
          revenue: 0,
        });
      }
      const agent = agentMap.get(agentName)!;
      agent.total += 1;
      if (sale.status === "approved") {
        agent.approved += 1;
      }
      agent.revenue += sale.charged_amount || 0;
    });

    return Array.from(agentMap.values());
  } catch (error) {
    console.error("Failed to fetch sales per agent:", error);
    return [];
  }
}

export async function getRevenueOverTime(
  period: "day" | "week" | "month" = "day",
): Promise<RevenueData[]> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from("sales")
      .select("created_at, charged_amount")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (!data) return [];

    // Group by period
    const dateMap = new Map<string, number>();

    data.forEach((sale: any) => {
      const date = new Date(sale.created_at);
      let key: string;

      if (period === "day") {
        key = date.toISOString().split("T")[0];
      } else if (period === "week") {
        const week = Math.floor((date.getDate() - date.getDay() + 6) / 7);
        key = `Week ${week}`;
      } else {
        key = date.toISOString().substring(0, 7);
      }

      dateMap.set(key, (dateMap.get(key) || 0) + (sale.charged_amount || 0));
    });

    return Array.from(dateMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  } catch (error) {
    console.error("Failed to fetch revenue over time:", error);
    return [];
  }
}

export async function getAgentDashboardStats(
  month: string,
): Promise<AgentDashboardStats> {
  const supabase = createClient();

  try {
    // Get current user's sales data
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("No authenticated user");
    }

    const { data: salesData } = await supabase
      .from("sales")
      .select("created_at, charged_amount, status")
      .eq("agent_id", userData.user.id)
      .is("deleted_at", null);

    const stats: AgentDashboardStats = {
      totalSales: salesData?.length || 0,
      todaySales: 0,
      todayRevenue: 0,
      monthSales: 0,
      monthRevenue: 0,
      pendingSales:
        salesData?.filter((s) => s.status === "pending").length || 0,
      approvedSales:
        salesData?.filter((s) => s.status === "approved").length || 0,
      rejectedSales:
        salesData?.filter((s) => s.status === "rejected").length || 0,
      totalRevenue:
        salesData?.reduce((sum, sale) => sum + (sale.charged_amount || 0), 0) ||
        0,
      totalCustomers: 0,
    };

    // Filter for month
    if (salesData) {
      const monthStart = `${month}-01`;
      const monthEnd = new Date(
        parseInt(month.split("-")[0]),
        parseInt(month.split("-")[1]),
        0,
      )
        .toISOString()
        .split("T")[0];

      const monthSales = salesData.filter((s) => {
        const saleDate = s.created_at.split("T")[0];
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      stats.monthSales = monthSales.length;
      stats.monthRevenue = monthSales.reduce(
        (sum, sale) => sum + (sale.charged_amount || 0),
        0,
      );

      // Today's sales
      const today = new Date().toISOString().split("T")[0];
      const todaySales = salesData.filter(
        (s) => s.created_at.split("T")[0] === today,
      );
      stats.todaySales = todaySales.length;
      stats.todayRevenue = todaySales.reduce(
        (sum, sale) => sum + (sale.charged_amount || 0),
        0,
      );
    }

    return stats;
  } catch (error) {
    console.error("Failed to fetch agent dashboard stats:", error);
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
}

export async function getAgentRecentSales(month: string): Promise<
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("No authenticated user");
    }

    const { data } = await supabase
      .from("sales")
      .select(
        `id,
        charged_amount,
        created_at,
        customers(name, company)`,
      )
      .eq("agent_id", userData.user.id)
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

export async function getProcessorDashboardStats(): Promise<ProcessorDashboardStats> {
  const supabase = createClient();

  try {
    const { data: salesData } = await supabase
      .from("sales")
      .select("created_at, charged_amount")
      .is("deleted_at", null);

    if (!salesData) {
      return {
        totalSales: 0,
        salesThisWeek: 0,
        weekRecordedRevenue: 0,
      };
    }

    // Get week's data
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekSales = salesData.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= weekStart;
    });

    return {
      totalSales: salesData.length,
      salesThisWeek: weekSales.length,
      weekRecordedRevenue: weekSales.reduce(
        (sum, sale) => sum + (sale.charged_amount || 0),
        0,
      ),
    };
  } catch (error) {
    console.error("Failed to fetch processor dashboard stats:", error);
    return {
      totalSales: 0,
      salesThisWeek: 0,
      weekRecordedRevenue: 0,
    };
  }
}

export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  const supabase = createClient();

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return null;
    }

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("id, check_in, check_out")
      .eq("user_id", userData.user.id)
      .eq("date", today)
      .single();

    return data || null;
  } catch (error) {
    console.error("Failed to fetch today attendance:", error);
    return null;
  }
}

export async function getRecentPayslips(limit: number = 5): Promise<Payslip[]> {
  const supabase = createClient();

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return [];
    }

    const { data } = await supabase
      .from("payslips")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data as Payslip[]) || [];
  } catch (error) {
    console.error("Failed to fetch recent payslips:", error);
    return [];
  }
}

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

    if (!data) {
      throw new Error("No attendance settings found");
    }

    const format12Hour = (time24: string) => {
      const [h = "0", m = "00"] = time24.split(":");
      const hour = Number(h);
      const minutes = m.slice(0, 2);
      const suffix = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
    };

    return {
      ...data,
      shift_start_12h: format12Hour(data.shift_start_time),
      late_after_12h: format12Hour(data.late_after_time),
      shift_end_12h: format12Hour(data.shift_end_time),
      checkout_latest_12h: format12Hour(data.checkout_latest_time),
    } as AttendanceSettings & {
      shift_start_12h: string;
      late_after_12h: string;
      shift_end_12h: string;
      checkout_latest_12h: string;
    };
  } catch (error) {
    console.error("Failed to fetch attendance settings:", error);
    const defaultTime = "09:00:00";
    const format12Hour = (time24: string) => {
      const [h = "0", m = "00"] = time24.split(":");
      const hour = Number(h);
      const minutes = m.slice(0, 2);
      const suffix = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
    };
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
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    if (!data) {
      throw new Error("No company settings found");
    }

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
