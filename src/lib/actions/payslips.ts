"use server";

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
  const generator = Array.isArray(payslip.generator) ? payslip.generator[0] : payslip.generator;
  const userEmployeeId = (user as { employee_id?: string | null } | null)?.employee_id?.trim() || "";
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
}) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const query = supabase
    .from("payslips")
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)", { count: "exact" })
    .order("pay_date", { ascending: false });

  if (filters?.search) {
    // Note: Searching on joined fields might need a different approach in Supabase, 
    // but for now we'll assume the client filters or we search on basic fields.
    // For exact match on user name we might need a separate query or RPC.
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const payslips: Payslip[] = (data as unknown as RawPayslipRow[] || []).map((payslip) => normalisePayslipRow(payslip));
  
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
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("payslips")
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)", { count: "exact" })
    .eq("user_id", user.id)
    .order("pay_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const payslips: Payslip[] = (data || []).map((payslip: any) => {
    const user = Array.isArray(payslip.user) ? payslip.user[0] : payslip.user;
    const generator = Array.isArray(payslip.generator) ? payslip.generator[0] : payslip.generator;
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
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email, employee_id), generator:users!payslips_generated_by_fkey(id, full_name)")
    .order("pay_date", { ascending: false })
    .limit(limit);

  if (user.role !== "super_admin") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((payslip: any) => {
    const user = Array.isArray(payslip.user) ? payslip.user[0] : payslip.user;
    const generator = Array.isArray(payslip.generator) ? payslip.generator[0] : payslip.generator;
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
  }
) {
  if (!input.user_id || !input.period_start || !input.period_end) {
    return { late_attendance: 0, leaves: 0 };
  }

  // Fallback keeps payroll usable even if attendance settings are missing.
  let lateAfterMinutes = 9 * 60 + 15;
  try {
    const settings = await getAttendanceSettings();
    const [lateHour, lateMinute] = settings.late_after_time.split(":").map(Number);
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

  (leaveRows || []).forEach((leave: { start_date: string; end_date: string | null }) => {
    const start = new Date(`${leave.start_date}T00:00:00`);
    const end = new Date(`${leave.end_date || leave.start_date}T00:00:00`);
    const overlapStart = start > startBoundary ? start : startBoundary;
    const overlapEnd = end < endBoundary ? end : endBoundary;
    if (overlapEnd < overlapStart) return;
    const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
    leaveDays += days;
  });

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

export async function createPayslip(input: CreatePayslipInput) {
  const admin = await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (!input.user_id || !input.period_start || !input.period_end || !input.pay_date) {
    throw new Error("User, period dates, and pay date are required");
  }

  const periodStart = new Date(input.period_start);
  const periodEnd = new Date(input.period_end);
  const payDate = new Date(input.pay_date);
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime()) || isNaN(payDate.getTime())) {
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
  const netPay = basicSalary + allowances + bonus + commission - advance - deductions;
  if (netPay < 0) {
    throw new Error("Net pay cannot be negative");
  }

  const status = input.status || "processed";
  const nowIso = new Date().toISOString();
  const lateAttendance = Number(input.late_attendance ?? 0);
  const leaves = Number(input.leaves ?? 0);

  const employeeIdDisplay = await resolveEmployeeIdDisplayForPayslip(input.user_id, null);

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
      currency: input.currency || "USD",
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
  if (!input.user_id || !input.period_start || !input.period_end || !input.pay_date) {
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
  const netPay = basicSalary + allowances + bonus + commission - advance - deductions;
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
      currency: input.currency || "USD",
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

  if (fetchError || !payslip) throw new Error(fetchError?.message || "Payslip not found");

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

export async function clonePayslipToNextMonth(payslipId: string, status: "processed" | "paid" = "processed") {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("payslips")
    .select("id, user_id, period_start, period_end, pay_date, basic_salary, allowances, deductions, bonus, currency")
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
    currency: source.currency || "USD",
    status,
  });
}

export async function deletePayslip(payslipId: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  if (!payslipId) {
    throw new Error("Payslip id is required");
  }

  const { error } = await supabase.from("payslips").delete().eq("id", payslipId);
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
