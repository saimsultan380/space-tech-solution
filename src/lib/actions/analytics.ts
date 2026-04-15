"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function getDashboardStats() {
  await requireAuth();
  const supabase = await createClient();

  const [salesRes, customersRes, chargebacksRes, usersRes, leavesRes] = await Promise.all([
    supabase.from("sales").select("id, status, charged_amount, agent_id, sale_type, created_at"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("chargebacks").select("id, status", { count: "exact" }),
    supabase.from("users").select("id, role", { count: "exact" }),
    supabase.from("leaves").select("id, status, start_date, end_date"),
  ]);

  const sales = salesRes.data || [];
  const rejectedSales = sales.filter((s) => s.status === "rejected").length;
  const recordedSales = sales.length - rejectedSales;
  const totalRevenue = sales
    .filter((s) => s.status !== "rejected")
    .reduce((sum, s) => sum + Number(s.charged_amount), 0);
  const totalChargebacks = chargebacksRes.count || 0;
  const openChargebacks = (chargebacksRes.data || []).filter((c) => c.status === "open").length;

  const leaves = leavesRes.data || [];
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const today = new Date().toISOString().split("T")[0];
  const todayOnLeave = leaves.filter((l) => {
    const start = l.start_date;
    const end = l.end_date || l.start_date;
    return start <= today && today <= end && l.status === "approved";
  }).length;

  return {
    totalSales: sales.length,
    totalRevenue,
    totalCustomers: customersRes.count || 0,
    pendingSales: 0,
    approvedSales: recordedSales,
    rejectedSales,
    totalChargebacks,
    openChargebacks,
    pendingLeaves,
    todayOnLeave,
    conversionRate:
      sales.length > 0 ? ((recordedSales / sales.length) * 100).toFixed(1) : "0",
  };
}

export async function getSalesPerAgent() {
  await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("agent_id, status, charged_amount, agent:users!sales_agent_id_fkey(full_name)");

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

export async function getSalesPerProcessor() {
  await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("processor_id, status, processor:users!sales_processor_id_fkey(full_name)")
    .not("processor_id", "is", null);

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
  const { data } = await supabase
    .from("sales")
    .select("charged_amount, created_at, status")
    .neq("status", "rejected")
    .order("created_at", { ascending: true });

  const revenueMap = new Map<string, number>();

  (data || []).forEach((sale) => {
    const date = new Date(sale.created_at);
    let key: string;

    if (period === "day") {
      key = date.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    revenueMap.set(key, (revenueMap.get(key) || 0) + Number(sale.charged_amount));
  });

  return Array.from(revenueMap.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}

export async function getChargebacksPerEmployee() {
  await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chargebacks")
    .select("sale:sales(agent_id, agent:users!sales_agent_id_fkey(full_name))");

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

export async function getAttendanceVsPerformance() {
  await requireAuth();
  const supabase = await createClient();

  const [attendanceRes, salesRes] = await Promise.all([
    supabase.from("attendance").select("user_id, date"),
    supabase
      .from("sales")
      .select("agent_id, status, agent:users!sales_agent_id_fkey(full_name)")
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

export async function getAgentDashboardStats() {
  const user = await requireAuth();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const [allSalesRes, todaySalesRes, customersRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, status, charged_amount, created_at")
      .eq("agent_id", user.id),
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
  const monthlySales = allSales.filter((s) => s.created_at >= monthStart);

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

export async function getAgentRecentSales() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sales")
    .select("id, company_name, charged_amount, created_at, customer:customers(name)")
    .eq("agent_id", user.id)
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
    supabase.from("sales").select("agent_id, status, charged_amount, sale_date, created_at"),
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
      const userSales = sales.filter((s) => {
        const raw = (s as { sale_date?: string | null; created_at?: string | null }).sale_date || 
          (s as { created_at?: string | null }).created_at;
        if (!raw) return false;
        const d = new Date(raw);
        const iso = d.toISOString().split("T")[0];
        return iso >= monthStart && iso < monthEnd && s.agent_id === u.id;
      });
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
