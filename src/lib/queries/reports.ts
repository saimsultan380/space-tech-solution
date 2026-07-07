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
    const monthStart = `${targetMonth}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    const [attendanceRes, salesRes] = await Promise.all([
      supabase
        .from("attendance")
        .select("user_id, date")
        .gte("date", monthStart)
        .lt("date", monthEnd),
      supabase
        .from("sales")
        .select(
          "agent_id, status, created_at, agent:users!sales_agent_id_fkey(full_name)",
        )
        .gte("created_at", `${monthStart}T00:00:00.000Z`)
        .lt("created_at", `${monthEnd}T00:00:00.000Z`)
        .neq("status", "rejected"),
    ]);

    const attendanceMap = new Map<string, number>();
    (attendanceRes.data || []).forEach((a: AttendanceRow) => {
      attendanceMap.set(a.user_id, (attendanceMap.get(a.user_id) || 0) + 1);
    });

    const salesMap = new Map<string, { name: string; sales: number }>();
    (salesRes.data || []).forEach((s: any) => {
      const agent = s.agent as { full_name: string } | null;
      const name = agent?.full_name || "Unknown";
      const existing = salesMap.get(s.agent_id) || { name, sales: 0 };
      existing.sales += 1;
      salesMap.set(s.agent_id, existing);
    });

    const result: {
      name: string;
      attendance_days: number;
      approved_sales: number;
    }[] = [];
    const allUsers = new Set([...attendanceMap.keys(), ...salesMap.keys()]);

    allUsers.forEach((userId) => {
      const salesData = salesMap.get(userId);
      result.push({
        name: salesData?.name || "Unknown",
        attendance_days: attendanceMap.get(userId) || 0,
        approved_sales: salesData?.sales || 0,
      });
    });

    return result;
  } catch (error) {
    console.error("Failed to fetch attendance vs performance:", error);
    return [];
  }
}

export async function getEmployeeMonthlyStats(month?: string) {
  try {
    const supabase = createClient();

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const monthStart = `${targetMonth}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    const [salesRes, attendanceRes, usersRes, callLogsRes, chargebacksRes] =
      await Promise.all([
        supabase
          .from("sales")
          .select("agent_id, status, charged_amount, sale_date, created_at")
          .gte("created_at", `${monthStart}T00:00:00.000Z`)
          .lt("created_at", `${monthEnd}T00:00:00.000Z`),
        supabase
          .from("attendance")
          .select("user_id, date, check_in, check_out")
          .gte("date", monthStart)
          .lt("date", monthEnd),
        supabase
          .from("users")
          .select("id, full_name, role")
          .eq("is_active", true),
        supabase
          .from("customers")
          .select("created_by")
          .eq("source", "call_log")
          .is("deleted_at", null)
          .gte("created_at", `${monthStart}T00:00:00.000Z`)
          .lt("created_at", `${monthEnd}T00:00:00.000Z`),
        supabase.rpc("get_chargebacks_per_employee_stats", {
          target_month: targetMonth as any,
        }),
      ]);

    const users = (usersRes.data || []) as EmployeeUserRow[];
    const sales = (salesRes.data || []) as EmployeeSaleRow[];
    const attendance = (attendanceRes.data || []) as EmployeeAttendanceRow[];

    const callLogsMap = new Map<string, number>();
    ((callLogsRes.data || []) as CallLogRow[]).forEach((cl) => {
      if (cl.created_by) {
        callLogsMap.set(cl.created_by, (callLogsMap.get(cl.created_by) || 0) + 1);
      }
    });

    const chargebacksMap = new Map<string, number>();
    ((chargebacksRes.data || []) as ChargebackRpcRow[]).forEach((row) => {
      if (row.agent_id) {
        chargebacksMap.set(row.agent_id, Number(row.count));
      }
    });

    return users.map((u: EmployeeUserRow) => {
      const userSales = sales.filter((s) => s.agent_id === u.id);
      const userAttendance = attendance.filter((a) => a.user_id === u.id);
      const totalHours = userAttendance.reduce(
        (sum: number, a: EmployeeAttendanceRow) => {
          if (!a.check_out) return sum;
          return (
            sum +
            (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) /
              3600000
          );
        },
        0,
      );

      const cbCount = chargebacksMap.get(u.id) || 0;
      const chargebackRatio =
        userSales.length > 0
          ? Math.round((cbCount / userSales.length) * 1000) / 10
          : 0;

      return {
        id: u.id,
        name: u.full_name,
        role: u.role,
        totalSales: userSales.length,
        approvedSales: userSales.filter((s) => s.status !== "rejected").length,
        rejectedSales: userSales.filter((s) => s.status === "rejected").length,
        revenue: userSales
          .filter((s) => s.status !== "rejected")
          .reduce(
            (sum: number, s: EmployeeSaleRow) => sum + Number(s.charged_amount),
            0,
          ),
        daysPresent: userAttendance.length,
        totalHours: Math.round(totalHours * 10) / 10,
        callLogResponses: callLogsMap.get(u.id) || 0,
        chargebacks: cbCount,
        chargebackRatio,
      };
    });
  } catch (error) {
    console.error("Failed to fetch employee monthly stats:", error);
    return [];
  }
}
