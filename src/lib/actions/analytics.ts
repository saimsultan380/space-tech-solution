"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

// ─── RPC row shapes ────────────────────────────────────────────────────────────

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

interface AgentRecentSaleRow {
  id: string;
  company_name: string;
  charged_amount: number;
  created_at: string;
  customer: { name: string } | null;
}

interface WeekSaleRow {
  charged_amount: number;
  status: string;
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

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getDashboardStats(month?: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_dashboard_analytics", {
    month_filter: month || null,
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
  const approvedSales = Number(stats.total_sales) - Number(stats.rejected_sales);

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
}

export async function getSalesPerAgent(month?: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sales_per_agent_stats", {
    target_month: month || null,
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
}

export async function getSalesPerProcessor(month?: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sales_per_processor_stats", {
    target_month: month || null,
  });

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
}

export async function getRevenueOverTime(period: "day" | "week" | "month" = "day") {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_revenue_over_time", {
    period_type: period,
  });

  if (error || !data) return [];

  return (data as Array<{ date: string; revenue: number }>).map((row) => ({
    date: row.date,
    revenue: Number(row.revenue),
  }));
}

export async function getChargebacksPerEmployee(month?: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_chargebacks_per_employee_stats", {
    target_month: month || null,
  });

  if (error) {
    console.error("Error fetching chargebacks per employee:", error);
    return [];
  }

  return (data || []).map((row: ChargebacksPerEmployeeRow) => ({
    name: row.name,
    count: Number(row.count),
  }));
}

export async function getAttendanceVsPerformance(month?: string) {
  await requireAuth();
  const supabase = await createClient();

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
      .select("agent_id, status, created_at, agent:users!sales_agent_id_fkey(full_name)")
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

  const result: { name: string; attendance_days: number; approved_sales: number }[] = [];
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
}

export async function getAgentDashboardStats(month?: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const filterMonth = month || today.substring(0, 7);
  const monthStart = filterMonth + "-01";
  const monthEnd = filterMonth === today.substring(0, 7)
    ? today + "T23:59:59"
    : new Date(new Date(filterMonth + "-01").getFullYear(), new Date(filterMonth + "-01").getMonth() + 1, 0).toISOString().split("T")[0] + "T23:59:59";

  const [allSalesRes, todaySalesRes, customersRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, status, charged_amount, created_at")
      .eq("agent_id", user.id)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd),
    supabase
      .from("sales")
      .select("id, status, charged_amount")
      .eq("agent_id", user.id)
      .gte("created_at", today + "T00:00:00"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
  ]);

  const allSales = (allSalesRes.data || []) as AgentSaleRow[];
  const todaySales = (todaySalesRes.data || []) as AgentSaleRow[];
  const monthlySales = allSales;

  const nonRejected = (rows: AgentSaleRow[]) =>
    rows.filter((s) => s.status !== "rejected");

  return {
    totalSales: allSales.length,
    todaySales: todaySales.length,
    todayRevenue: nonRejected(todaySales).reduce(
      (sum: number, s: AgentSaleRow) => sum + Number(s.charged_amount),
      0,
    ),
    monthSales: monthlySales.length,
    monthRevenue: nonRejected(monthlySales).reduce(
      (sum: number, s: AgentSaleRow) => sum + Number(s.charged_amount),
      0,
    ),
    pendingSales: 0,
    approvedSales: allSales.filter((s) => s.status !== "rejected").length,
    rejectedSales: allSales.filter((s) => s.status === "rejected").length,
    totalRevenue: nonRejected(allSales).reduce(
      (sum: number, s: AgentSaleRow) => sum + Number(s.charged_amount),
      0,
    ),
    totalCustomers: customersRes.count || 0,
  };
}

export async function getAgentRecentSales(month?: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const filterMonth = month || today.substring(0, 7);
  const monthStart = filterMonth + "-01";
  const monthEnd = filterMonth === today.substring(0, 7)
    ? today + "T23:59:59"
    : new Date(new Date(filterMonth + "-01").getFullYear(), new Date(filterMonth + "-01").getMonth() + 1, 0).toISOString().split("T")[0] + "T23:59:59";

  const { data } = await supabase
    .from("sales")
    .select("id, company_name, charged_amount, created_at, customer:customers(name)")
    .eq("agent_id", user.id)
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data || []).map((s: any) => ({
    ...s,
    customer_name: s.customer?.name || "N/A",
  }));
}

export async function getProcessorDashboardStats() {
  await requireAuth();
  const supabase = await createClient();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [totalRes, weekRes] = await Promise.all([
    supabase.from("sales").select("id", { count: "exact", head: true }),
    supabase
      .from("sales")
      .select("charged_amount, status")
      .gte("created_at", weekStart.toISOString()),
  ]);

  const weekRows = (weekRes.data || []) as WeekSaleRow[];
  const weekRecordedRevenue = weekRows
    .filter((s) => s.status !== "rejected")
    .reduce((sum, s) => sum + Number(s.charged_amount), 0);

  return {
    totalSales: totalRes.count || 0,
    salesThisWeek: weekRows.length,
    weekRecordedRevenue,
  };
}

export async function getEmployeeMonthlyStats(month?: string) {
  await requireAuth();
  const supabase = await createClient();

  const targetMonth = month || new Date().toISOString().substring(0, 7); // e.g. "2026-03"
  const monthStart = `${targetMonth}-01`;
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  const [salesRes, attendanceRes, usersRes] = await Promise.all([
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
    supabase.from("users").select("id, full_name, role").eq("is_active", true),
  ]);

  const users = (usersRes.data || []) as EmployeeUserRow[];
  const sales = (salesRes.data || []) as EmployeeSaleRow[];
  const attendance = (attendanceRes.data || []) as EmployeeAttendanceRow[];

  return users.map((u: EmployeeUserRow) => {
    const userSales = sales.filter((s) => s.agent_id === u.id);
    const userAttendance = attendance.filter((a) => a.user_id === u.id);
    const totalHours = userAttendance.reduce((sum: number, a: EmployeeAttendanceRow) => {
      if (!a.check_out) return sum;
      return sum + (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000;
    }, 0);

    return {
      id: u.id,
      name: u.full_name,
      role: u.role,
      totalSales: userSales.length,
      approvedSales: userSales.filter((s) => s.status !== "rejected").length,
      rejectedSales: userSales.filter((s) => s.status === "rejected").length,
      revenue: userSales
        .filter((s) => s.status !== "rejected")
        .reduce((sum: number, s: EmployeeSaleRow) => sum + Number(s.charged_amount), 0),
      daysPresent: userAttendance.length,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  });
}
