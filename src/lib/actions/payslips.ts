"use server";

import { parsePageSize } from "@/lib/page-size";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import { formatCnic } from "@/lib/utils";
import type { Payslip } from "@/lib/types";

// Raw Supabase row — joined user/generator fields may come back as array or object
interface RawPayslipRow extends Record<string, unknown> {
  user: Payslip["user"] | Payslip["user"][] | null;
  generator: Payslip["generator"] | Payslip["generator"][] | null;
  employee_id_display?: string | null;
}

function normalisePayslipRow(payslip: RawPayslipRow): Payslip {
  const user = Array.isArray(payslip.user) ? payslip.user[0] : payslip.user;
  const generator = Array.isArray(payslip.generator)
    ? payslip.generator[0]
    : payslip.generator;
  const userEmployeeId =
    (user as { employee_id?: string | null } | null)?.employee_id?.trim() || "";
  const storedEmployeeId = payslip.employee_id_display?.trim() || "";
  return {
    ...(payslip as unknown as Payslip),
    user: user ?? null,
    generator: generator ?? null,
    employee_id_display: storedEmployeeId || userEmployeeId || null,
  };
}

interface CreatePayslipInput {
  user_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  currency: string;
  status?: "processed" | "paid";
  // New fields
  employee_id_display?: string;
  joining_date?: string;
  category?: string;
  department?: string;
  job_position?: string;
  father_name?: string;
  pay_days?: number;
  cnic_no?: string;
  address?: string;
  pay_rate?: number;
  gross_pay?: number;
  monthly_revenue?: number;
  chargeback_amount?: number;
  remaining?: number;
  commission?: number;
  advance?: number;
  late_attendance?: number;
  leaves?: number;
  paid_through?: string;
  bank_account_no?: string;
  bank_branch?: string;
  pdf_url?: string;
}

interface UpdatePayslipInput extends CreatePayslipInput {
  id: string;
}

/**
 * Resolve payslip employee_id_display: optional snapshot from the form (updates only);
 * otherwise users.employee_id; if still empty, assign via ensure_user_employee_id (service_role).
 */
async function resolveEmployeeIdDisplayForPayslip(
  userId: string,
  formValue: string | null | undefined,
): Promise<string | null> {
  const trimmed = typeof formValue === "string" ? formValue.trim() : "";
  if (trimmed) return trimmed;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("users")
    .select("employee_id")
    .eq("id", userId)
    .maybeSingle();
  const existing = row?.employee_id?.trim();
  if (existing) return existing;

  const admin = createAdminClient();
  const { data: assigned, error } = await admin.rpc("ensure_user_employee_id", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  if (typeof assigned === "string" && assigned.trim()) return assigned.trim();
  return null;
}

export async function getPayslips(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = parsePageSize(filters?.pageSize);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("payslips")
    .select(
      "*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)",
      { count: "exact" },
    );

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.from_date) {
    query = query.gte("period_start", filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte("period_end", filters.to_date);
  }

  if (filters?.month && filters.month !== "all") {
    const [year, m] = filters.month.split("-").map(Number);
    const startDate = `${filters.month}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${filters.month}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("period_start", startDate).lte("period_start", endDate);
  }

  if (filters?.search) {
    const searchVal = filters.search.trim();
    if (searchVal) {
      const { data: matchedUsers } = await supabase
        .from("users")
        .select("id")
        .or(`full_name.ilike.%${searchVal}%,role.ilike.%${searchVal}%,employee_id.ilike.%${searchVal}%,department.ilike.%${searchVal}%`);
      
      const userIds = (matchedUsers || []).map((u) => u.id);
      
      if (userIds.length > 0) {
        query = query.or(`user_id.in.(${userIds.join(",")}),department.ilike.%${searchVal}%,employee_id_display.ilike.%${searchVal}%`);
      } else {
        query = query.or(`department.ilike.%${searchVal}%,employee_id_display.ilike.%${searchVal}%`);
      }
    }
  }

  query = query.order("pay_date", { ascending: false });

  const { data, error, count } = await query.range(
    offset,
    offset + pageSize - 1,
  );

  if (error) throw new Error(error.message);

  const payslips: Payslip[] = ((data as unknown as RawPayslipRow[]) || []).map(
    (payslip) => normalisePayslipRow(payslip),
  );

  return {
    data: payslips,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getMyPayslips(filters?: {
  page?: number;
  pageSize?: number;
  month?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = parsePageSize(filters?.pageSize);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("payslips")
    .select(
      "*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)",
      { count: "exact" },
    )
    .eq("user_id", user.id);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.from_date) {
    query = query.gte("period_start", filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte("period_end", filters.to_date);
  }

  if (filters?.month && filters.month !== "all") {
    const [year, m] = filters.month.split("-").map(Number);
    const startDate = `${filters.month}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${filters.month}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("period_start", startDate).lte("period_start", endDate);
  }

  query = query.order("pay_date", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const payslips: Payslip[] = (data || []).map((payslip: any) => {
    const user = Array.isArray(payslip.user) ? payslip.user[0] : payslip.user;
    const generator = Array.isArray(payslip.generator)
      ? payslip.generator[0]
      : payslip.generator;
    const userEmployeeId = user?.employee_id?.trim() || "";
    const storedEmployeeId = payslip.employee_id_display?.trim() || "";
    return {
      ...payslip,
      user,
      generator,
      employee_id_display: storedEmployeeId || userEmployeeId || null,
    };
  });

  return {
    data: payslips,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getRecentPayslips(limit = 5) {
  const user = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("payslips")
    .select(
      "*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)",
    )
    .order("pay_date", { ascending: false })
    .limit(limit);

  if (user.role !== "super_admin") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((payslip: any) => {
    const user = Array.isArray(payslip.user) ? payslip.user[0] : payslip.user;
    const generator = Array.isArray(payslip.generator)
      ? payslip.generator[0]
      : payslip.generator;
    const userEmployeeId = user?.employee_id?.trim() || "";
    const storedEmployeeId = payslip.employee_id_display?.trim() || "";
    return {
      ...payslip,
      user,
      generator,
      employee_id_display: storedEmployeeId || userEmployeeId || null,
    };
  }) as Payslip[];
}

async function computePayslipAttendanceSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    user_id: string;
    period_start: string;
    period_end: string;
  },
) {
  if (!input.user_id || !input.period_start || !input.period_end) {
    return { late_attendance: 0, leaves: 0 };
  }

  // Fallback keeps payroll usable even if attendance settings are missing.
  let lateAfterMinutes = 9 * 60 + 15;
  try {
    const settings = await getAttendanceSettings();
    const [lateHour, lateMinute] = settings.late_after_time
      .split(":")
      .map(Number);
    lateAfterMinutes = (lateHour || 0) * 60 + (lateMinute || 0);
  } catch {
    lateAfterMinutes = 9 * 60 + 15;
  }

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("attendance")
    .select("check_in")
    .eq("user_id", input.user_id)
    .gte("date", input.period_start)
    .lte("date", input.period_end);
  if (attendanceError) throw new Error(attendanceError.message);

  let lateCount = 0;
  (attendanceRows || []).forEach((row: { check_in: string | null }) => {
    if (!row.check_in) return;
    const checkIn = new Date(row.check_in);
    const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
    if (checkInMinutes > lateAfterMinutes) lateCount += 1;
  });

  const { data: leaveRows, error: leaveError } = await supabase
    .from("leaves")
    .select("start_date, end_date")
    .eq("user_id", input.user_id)
    .eq("status", "approved")
    .lte("start_date", input.period_end)
    .gte("end_date", input.period_start);
  if (leaveError) throw new Error(leaveError.message);

  const startBoundary = new Date(`${input.period_start}T00:00:00`);
  const endBoundary = new Date(`${input.period_end}T00:00:00`);
  let leaveDays = 0;

  (leaveRows || []).forEach(
    (leave: { start_date: string; end_date: string | null }) => {
      const start = new Date(`${leave.start_date}T00:00:00`);
      const end = new Date(`${leave.end_date || leave.start_date}T00:00:00`);
      const overlapStart = start > startBoundary ? start : startBoundary;
      const overlapEnd = end < endBoundary ? end : endBoundary;
      if (overlapEnd < overlapStart) return;
      const days =
        Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) +
        1;
      leaveDays += days;
    },
  );

  return {
    late_attendance: lateCount,
    leaves: leaveDays,
  };
}

export async function getPayslipAttendanceSummary(input: {
  user_id: string;
  period_start: string;
  period_end: string;
}) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  return computePayslipAttendanceSummary(supabase, input);
}

export interface EmployeeRevenueSummary {
  monthly_revenue: number;
  chargeback_amount: number;
  remaining: number;
  sales_count: number;
  chargebacks_count: number;
  commission_pkr: number;
  cb_start_date: string;
  cb_end_date: string;
}

export async function getEmployeeRevenueAndChargebacks(input: {
  user_id: string;
  period_start: string;
  period_end: string;
}): Promise<EmployeeRevenueSummary> {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  if (!input.user_id || !input.period_start || !input.period_end) {
    return {
      monthly_revenue: 0,
      chargeback_amount: 0,
      remaining: 0,
      sales_count: 0,
      chargebacks_count: 0,
      commission_pkr: 0,
      cb_start_date: "",
      cb_end_date: "",
    };
  }

  const startDate = input.period_start;
  const endDate = input.period_end;

  // Chargeback calculation window: 10th of the salary month to 10th of the following month
  // E.g., if salary period is Nov 2026 (2026-11-01 to 2026-11-30), chargebacks are counted from 2026-11-10 to 2026-12-10
  const [pYear, pMonth] = input.period_start.split("-").map(Number);
  let cbStartDate = "";
  let cbEndDate = "";

  if (pYear && pMonth) {
    const nextMonth = pMonth === 12 ? 1 : pMonth + 1;
    const nextYear = pMonth === 12 ? pYear + 1 : pYear;
    cbStartDate = `${pYear}-${String(pMonth).padStart(2, "0")}-10`;
    cbEndDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`;
  } else {
    cbStartDate = startDate;
    cbEndDate = endDate;
  }

  // 1. Fetch sales for this agent in the salary period
  const { data: sales, error: salesError } = await admin
    .from("sales")
    .select("id, amount, charged_amount, status, sale_date, created_at")
    .eq("agent_id", input.user_id)
    .neq("status", "rejected")
    .is("deleted_at", null);

  if (salesError) {
    console.error("[getEmployeeRevenueAndChargebacks] sales error:", salesError.message);
  }

  const periodSales = (sales || []).filter((s: any) => {
    const d = s.sale_date || (s.created_at ? s.created_at.slice(0, 10) : "");
    return d >= startDate && d <= endDate;
  });

  const salesCount = periodSales.length;
  const monthlyRevenue = periodSales.reduce((acc: number, s: any) => {
    const val = Number(s.charged_amount ?? s.amount ?? 0);
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);

  // 2. Fetch chargebacks for this agent recorded in the 10th-to-10th pay cycle
  // (regardless of when original sale was made, as prior chargebacks were deducted in prior month)
  const allAgentSaleIds = (sales || []).map((s: any) => s.id);

  const { data: cbRows, error: cbError } = await admin
    .from("chargebacks")
    .select(`
      id,
      sale_id,
      status,
      date,
      created_at,
      assigned_to,
      sale:sales!chargebacks_sale_id_fkey(
        id,
        agent_id,
        amount,
        charged_amount,
        deleted_at
      )
    `);

  if (cbError) {
    console.error("[getEmployeeRevenueAndChargebacks] chargeback error:", cbError.message);
  }

  const periodChargebacks = (cbRows || []).filter((cb: any) => {
    const d = cb.date || (cb.created_at ? cb.created_at.slice(0, 10) : "");
    const inPeriod = d >= cbStartDate && d <= cbEndDate;
    if (!inPeriod) return false;

    const sale = Array.isArray(cb.sale) ? cb.sale[0] : cb.sale;
    const isAgentSale = (sale && sale.agent_id === input.user_id) || allAgentSaleIds.includes(cb.sale_id);
    const isAssigned = cb.assigned_to === input.user_id;

    return isAgentSale || isAssigned;
  });

  const seenSaleIds = new Set<string>();
  let chargebackAmount = 0;

  for (const cb of periodChargebacks) {
    const sale = Array.isArray(cb.sale) ? cb.sale[0] : cb.sale;
    const sid = String(cb.sale_id);
    if (!seenSaleIds.has(sid)) {
      seenSaleIds.add(sid);
      const val = Number(sale?.charged_amount ?? sale?.amount ?? 0);
      chargebackAmount += Number.isFinite(val) ? val : 0;
    }
  }

  const roundedRevenue = Number(monthlyRevenue.toFixed(2));
  const roundedCb = Number(chargebackAmount.toFixed(2));
  const roundedRemaining = Number((roundedRevenue - roundedCb).toFixed(2));

  // Commission rate: $100 USD = 1,000 PKR ($1,000 USD = 10,000 PKR). Amounts under $100 do not count.
  const commissionPkr =
    roundedRemaining >= 100 ? Math.floor(roundedRemaining / 100) * 1000 : 0;

  return {
    monthly_revenue: roundedRevenue,
    chargeback_amount: roundedCb,
    remaining: roundedRemaining,
    sales_count: salesCount,
    chargebacks_count: periodChargebacks.length,
    commission_pkr: commissionPkr,
    cb_start_date: cbStartDate,
    cb_end_date: cbEndDate,
  };
}

export async function createPayslip(input: CreatePayslipInput) {
  const admin = await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (
    !input.user_id ||
    !input.period_start ||
    !input.period_end ||
    !input.pay_date
  ) {
    throw new Error("User, period dates, and pay date are required");
  }

  const periodStart = new Date(input.period_start);
  const periodEnd = new Date(input.period_end);
  const payDate = new Date(input.pay_date);
  if (
    isNaN(periodStart.getTime()) ||
    isNaN(periodEnd.getTime()) ||
    isNaN(payDate.getTime())
  ) {
    throw new Error("Invalid date input");
  }
  if (periodEnd < periodStart) {
    throw new Error("Period end date must be after period start date");
  }

  const { data: duplicate } = await supabase
    .from("payslips")
    .select("id")
    .eq("user_id", input.user_id)
    .eq("period_start", input.period_start)
    .eq("period_end", input.period_end)
    .maybeSingle();
  if (duplicate) {
    throw new Error("Payslip for this employee and period already exists");
  }

  const basicSalary = Number(input.basic_salary || 0);
  const allowances = Number(input.allowances || 0);
  const deductions = Number(input.deductions || 0);
  const bonus = Number(input.bonus || 0);
  const commission = Number(input.commission || 0);
  const advance = Number(input.advance || 0);
  const netPay =
    basicSalary + allowances + bonus + commission - advance - deductions;
  if (netPay < 0) {
    throw new Error("Net pay cannot be negative");
  }

  const status = input.status || "processed";
  const nowIso = new Date().toISOString();
  const lateAttendance = Number(input.late_attendance ?? 0);
  const leaves = Number(input.leaves ?? 0);

  const employeeIdDisplay = await resolveEmployeeIdDisplayForPayslip(
    input.user_id,
    null,
  );

  const { data, error } = await supabase
    .from("payslips")
    .insert({
      user_id: input.user_id,
      generated_by: admin.id,
      period_start: input.period_start,
      period_end: input.period_end,
      pay_date: input.pay_date,
      basic_salary: basicSalary,
      allowances,
      deductions,
      bonus,
      commission,
      advance,
      net_pay: netPay,
      currency: input.currency || "PKR",
      status,
      sent_at: status === "paid" ? nowIso : null,
      employee_id_display: employeeIdDisplay,
      joining_date: input.joining_date,
      category: input.category,
      department: input.department,
      job_position: input.job_position,
      father_name: input.father_name,
      pay_days: input.pay_days,
      cnic_no: input.cnic_no ? formatCnic(input.cnic_no) : null,
      address: input.address,
      pay_rate: input.pay_rate,
      gross_pay: input.gross_pay,
      monthly_revenue: input.monthly_revenue,
      chargeback_amount: input.chargeback_amount,
      remaining: input.remaining,
      late_attendance: lateAttendance,
      leaves,
      paid_through: input.paid_through,
      bank_account_no: input.bank_account_no,
      bank_branch: input.bank_branch,
      pdf_url: input.pdf_url,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (status === "paid") {
    await createNotification({
      user_id: input.user_id,
      title: "New payslip received",
      body: `Your payslip for ${input.period_start} to ${input.period_end} is now available.`,
      type: "payslip",
    });
  }

  revalidatePath("/dashboard/payslips");
  revalidatePath("/dashboard");
  return data;
}

export async function updatePayslip(input: UpdatePayslipInput) {
  const admin = await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (!input.id) {
    throw new Error("Payslip id is required");
  }
  if (
    !input.user_id ||
    !input.period_start ||
    !input.period_end ||
    !input.pay_date
  ) {
    throw new Error("User, period dates, and pay date are required");
  }

  const periodStart = new Date(input.period_start);
  const periodEnd = new Date(input.period_end);
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
    throw new Error("Invalid date input");
  }
  if (periodEnd < periodStart) {
    throw new Error("Period end date must be after period start date");
  }

  const basicSalary = Number(input.basic_salary || 0);
  const allowances = Number(input.allowances || 0);
  const deductions = Number(input.deductions || 0);
  const bonus = Number(input.bonus || 0);
  const commission = Number(input.commission || 0);
  const advance = Number(input.advance || 0);
  const netPay =
    basicSalary + allowances + bonus + commission - advance - deductions;
  if (netPay < 0) {
    throw new Error("Net pay cannot be negative");
  }

  const status = input.status || "processed";
  const sentAt = status === "paid" ? new Date().toISOString() : null;
  const lateAttendance = Number(input.late_attendance ?? 0);
  const leaves = Number(input.leaves ?? 0);

  const employeeIdDisplay = await resolveEmployeeIdDisplayForPayslip(
    input.user_id,
    input.employee_id_display,
  );

  const { error } = await supabase
    .from("payslips")
    .update({
      user_id: input.user_id,
      generated_by: admin.id,
      period_start: input.period_start,
      period_end: input.period_end,
      pay_date: input.pay_date,
      basic_salary: basicSalary,
      allowances,
      deductions,
      bonus,
      commission,
      advance,
      net_pay: netPay,
      currency: input.currency || "PKR",
      status,
      sent_at: sentAt,
      employee_id_display: employeeIdDisplay,
      joining_date: input.joining_date,
      category: input.category,
      department: input.department,
      job_position: input.job_position,
      father_name: input.father_name,
      pay_days: input.pay_days,
      cnic_no: input.cnic_no ? formatCnic(input.cnic_no) : null,
      address: input.address,
      pay_rate: input.pay_rate,
      gross_pay: input.gross_pay,
      monthly_revenue: input.monthly_revenue,
      chargeback_amount: input.chargeback_amount,
      remaining: input.remaining,
      late_attendance: lateAttendance,
      leaves,
      paid_through: input.paid_through,
      bank_account_no: input.bank_account_no,
      bank_branch: input.bank_branch,
      pdf_url: input.pdf_url,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  if (status === "paid") {
    await createNotification({
      user_id: input.user_id,
      title: "Payslip updated",
      body: `Your payslip for ${input.period_start} to ${input.period_end} has been updated.`,
      type: "payslip",
    });
  }

  revalidatePath("/dashboard/payslips");
  revalidatePath("/dashboard");
}

export async function markPayslipAsPaid(payslipId: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: payslip, error: fetchError } = await supabase
    .from("payslips")
    .select("id, user_id, period_start, period_end")
    .eq("id", payslipId)
    .single();

  if (fetchError || !payslip)
    throw new Error(fetchError?.message || "Payslip not found");

  const sentAt = new Date().toISOString();
  const { error } = await supabase
    .from("payslips")
    .update({ status: "paid", sent_at: sentAt })
    .eq("id", payslipId);

  if (error) throw new Error(error.message);

  await createNotification({
    user_id: payslip.user_id,
    title: "New payslip received",
    body: `Your payslip for ${payslip.period_start} to ${payslip.period_end} is now available.`,
    type: "payslip",
  });

  revalidatePath("/dashboard/payslips");
  revalidatePath("/dashboard");
}

export async function clonePayslipToNextMonth(
  payslipId: string,
  status: "processed" | "paid" = "processed",
) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("payslips")
    .select(
      "id, user_id, period_start, period_end, pay_date, basic_salary, allowances, deductions, bonus, currency",
    )
    .eq("id", payslipId)
    .single();

  if (sourceError || !source) {
    throw new Error(sourceError?.message || "Source payslip not found");
  }

  const nextPeriodStart = shiftOneMonth(source.period_start);
  const nextPeriodEnd = shiftOneMonth(source.period_end);
  const nextPayDate = shiftOneMonth(source.pay_date);

  const { data: duplicate } = await supabase
    .from("payslips")
    .select("id")
    .eq("user_id", source.user_id)
    .eq("period_start", nextPeriodStart)
    .eq("period_end", nextPeriodEnd)
    .maybeSingle();
  if (duplicate) {
    throw new Error("Next month payslip already exists for this employee");
  }

  await createPayslip({
    user_id: source.user_id,
    period_start: nextPeriodStart,
    period_end: nextPeriodEnd,
    pay_date: nextPayDate,
    basic_salary: Number(source.basic_salary || 0),
    allowances: Number(source.allowances || 0),
    deductions: Number(source.deductions || 0),
    bonus: Number(source.bonus || 0),
    currency: "PKR",
    status,
  });
}

export async function deletePayslip(payslipId: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (!payslipId) {
    throw new Error("Payslip id is required");
  }

  const { error } = await supabase
    .from("payslips")
    .delete()
    .eq("id", payslipId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/payslips");
  revalidatePath("/dashboard");
}

function shiftOneMonth(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Upload a payslip PDF file to Supabase storage
 */
export async function uploadPayslipPdf(formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) {
    throw new Error("No file provided");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Validate file type
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed");
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size must be less than 10MB");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${userId}/${timestamp}_${sanitizedFileName}`;

  // Upload file to storage
  const { data, error } = await supabase.storage
    .from("payslip-pdfs")
    .upload(fileName, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: fileName,
  };
}

/**
 * Delete a payslip PDF file from Supabase storage
 */
export async function deletePayslipPdf(filePath: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (!filePath) {
    throw new Error("File path is required");
  }

  const { error } = await supabase.storage
    .from("payslip-pdfs")
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get a signed URL for viewing a payslip PDF
 */
export async function getPayslipPdfUrl(filePath: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  if (!filePath) {
    throw new Error("File path is required");
  }

  // Check if user has access to this payslip
  // File path format: {user_id}/{filename}
  const fileUserId = filePath.split("/")[0];
  
  if (user.role !== "super_admin" && user.id !== fileUserId) {
    throw new Error("Unauthorized access to this payslip");
  }

  // Generate signed URL valid for 1 hour
  const { data, error } = await supabase.storage
    .from("payslip-pdfs")
    .createSignedUrl(filePath, 3600);

  if (error) {
    throw new Error(`Failed to generate URL: ${error.message}`);
  }

  return data.signedUrl;
}
