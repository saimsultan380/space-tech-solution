"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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
  let query = supabase
    .from("sales")
    .select("agent_id, status, charged_amount, created_at, agent:users!sales_agent_id_fkey(full_name)");

  if (month) {
    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("created_at", `${monthStart}T00:00:00.000Z`).lt("created_at", `${monthEnd}T00:00:00.000Z`);
  }

  const { data } = await query;

  const agentMap = new Map<string, { name: string; total: number; approved: number; revenue: number }>();

  (data || []).forEach((sale) => {
    const agent = sale.agent as unknown as { full_name: string } | null;
    const agentName = agent?.full_name || "Unknown";
    const existing = agentMap.get(sale.agent_id) || {
      name: agentName,
      total: 0,
      approved: 0,
      revenue: 0,
    };
    existing.total += 1;
    if (sale.status !== "rejected") {
      existing.approved += 1;
      existing.revenue += Number(sale.charged_amount);
    }
    agentMap.set(sale.agent_id, existing);
  });

  return Array.from(agentMap.values());
}

export async function getSalesPerProcessor(month?: string) {
  await requireAuth();
  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select("processor_id, status, created_at, processor:users!sales_processor_id_fkey(full_name)")
    .not("processor_id", "is", null);

  if (month) {
    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("created_at", `${monthStart}T00:00:00.000Z`).lt("created_at", `${monthEnd}T00:00:00.000Z`);
  }

  const { data } = await query;

  const procMap = new Map<string, { name: string; total: number; approved: number; rejected: number }>();

  (data || []).forEach((sale) => {
    const proc = sale.processor as unknown as { full_name: string } | null;
    const procName = proc?.full_name || "Unknown";
    const pid = sale.processor_id!;
    const existing = procMap.get(pid) || {
      name: procName,
      total: 0,
      approved: 0,
      rejected: 0,
    };
    existing.total += 1;
    if (sale.status !== "rejected") existing.approved += 1;
    if (sale.status === "rejected") existing.rejected += 1;
    procMap.set(pid, existing);
  });

  return Array.from(procMap.values());
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
  let query = supabase
    .from("chargebacks")
    .select("created_at, sale:sales(agent_id, agent:users!sales_agent_id_fkey(full_name))");

  if (month) {
    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("created_at", `${monthStart}T00:00:00.000Z`).lt("created_at", `${monthEnd}T00:00:00.000Z`);
  }

  const { data } = await query;

  const empMap = new Map<string, { name: string; count: number }>();

  (data || []).forEach((cb) => {
    const sale = cb.sale as unknown as { agent_id: string; agent: { full_name: string } | null } | null;
    if (!sale) return;
    const agentName = sale.agent?.full_name || "Unknown";
    const existing = empMap.get(sale.agent_id) || { name: agentName, count: 0 };
    existing.count += 1;
    empMap.set(sale.agent_id, existing);
  });

  return Array.from(empMap.values());
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
  (attendanceRes.data || []).forEach((a) => {
    attendanceMap.set(a.user_id, (attendanceMap.get(a.user_id) || 0) + 1);
  });

  const salesMap = new Map<string, { name: string; sales: number }>();
  (salesRes.data || []).forEach((s) => {
    const agent = s.agent as unknown as { full_name: string } | null;
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

  const allSales = allSalesRes.data || [];
  const todaySales = todaySalesRes.data || [];
  const monthlySales = allSales;

  const nonRejected = <T extends { status: string; charged_amount: unknown }>(rows: T[]) =>
    rows.filter((s) => s.status !== "rejected");

  return {
    totalSales: allSales.length,
    todaySales: todaySales.length,
    todayRevenue: nonRejected(todaySales).reduce(
      (sum, s) => sum + Number(s.charged_amount),
      0,
    ),
    monthSales: monthlySales.length,
    monthRevenue: nonRejected(monthlySales).reduce(
      (sum, s) => sum + Number(s.charged_amount),
      0,
    ),
    pendingSales: 0,
    approvedSales: allSales.filter((s) => s.status !== "rejected").length,
    rejectedSales: allSales.filter((s) => s.status === "rejected").length,
    totalRevenue: nonRejected(allSales).reduce(
      (sum, s) => sum + Number(s.charged_amount),
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

  return (data || []).map((s) => ({
    ...s,
    customer_name: (s.customer as unknown as { name: string } | null)?.name || "N/A",
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

  const weekRows = weekRes.data || [];
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

  const users = usersRes.data || [];
  const sales = salesRes.data || [];
  const attendance = attendanceRes.data || [];

  return users.map((u) => {
    const userSales = sales.filter((s) => s.agent_id === u.id);
    const userAttendance = attendance.filter((a) => a.user_id === u.id);
    const totalHours = userAttendance.reduce((sum, a) => {
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
        .reduce((sum, s) => sum + Number(s.charged_amount), 0),
      daysPresent: userAttendance.length,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  });
}
