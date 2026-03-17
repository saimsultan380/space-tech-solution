"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";

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
  notes?: string;
  status?: "draft" | "sent";
}

interface UpdatePayslipInput extends CreatePayslipInput {
  id: string;
}

export async function getPayslips() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payslips")
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email), generator:users!payslips_generated_by_fkey(id, full_name)")
    .order("pay_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMyPayslips() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payslips")
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email), generator:users!payslips_generated_by_fkey(id, full_name)")
    .eq("user_id", user.id)
    .order("pay_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getRecentPayslips(limit = 5) {
  const user = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("payslips")
    .select("*, user:users!payslips_user_id_fkey(id, full_name, role, email), generator:users!payslips_generated_by_fkey(id, full_name)")
    .order("pay_date", { ascending: false })
    .limit(limit);

  if (user.role !== "super_admin") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
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
  const netPay = basicSalary + allowances + bonus - deductions;
  if (netPay < 0) {
    throw new Error("Net pay cannot be negative");
  }

  const status = input.status || "draft";
  const nowIso = new Date().toISOString();

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
      net_pay: netPay,
      currency: input.currency || "PKR",
      notes: input.notes?.trim() || "",
      status,
      sent_at: status === "sent" ? nowIso : null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (status === "sent") {
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
  const netPay = basicSalary + allowances + bonus - deductions;
  if (netPay < 0) {
    throw new Error("Net pay cannot be negative");
  }

  const status = input.status || "draft";
  const sentAt = status === "sent" ? new Date().toISOString() : null;

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
      net_pay: netPay,
      currency: input.currency || "PKR",
      notes: input.notes?.trim() || "",
      status,
      sent_at: sentAt,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  if (status === "sent") {
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

export async function markPayslipAsSent(payslipId: string) {
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
    .update({ status: "sent", sent_at: sentAt })
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

export async function clonePayslipToNextMonth(payslipId: string, status: "draft" | "sent" = "draft") {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("payslips")
    .select("*")
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
    currency: source.currency || "PKR",
    notes: source.notes || "",
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
