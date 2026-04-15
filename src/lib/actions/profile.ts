"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { formatCnic } from "@/lib/utils";

export async function updateProfile(formData: {
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  company_name?: string | null;
  education_degree?: string | null;
  joining_date?: string | null;
  employment_type?: string | null;
  category?: string | null;
  job_position?: string | null;
  father_name?: string | null;
  cnic?: string | null;
  address?: string | null;
  pay_days?: number | null;
  pay_rate?: number | null;
  gross_pay?: number | null;
  basic_salary?: number | null;
  paid_through?: string | null;
  bank_account_no?: string | null;
  bank_branch?: string | null;
}) {
  const user = await requireAuth();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    full_name: formData.full_name,
    avatar_url: formData.avatar_url ?? null,
  };

  if (formData.department !== undefined) {
    updateData.department = formData.department || null;
  }
  if (formData.company_name !== undefined) {
    updateData.company_name = formData.company_name || null;
  }
  if (formData.education_degree !== undefined) {
    updateData.education_degree = formData.education_degree || null;
  }
  if (formData.joining_date !== undefined) {
    updateData.joining_date = formData.joining_date || null;
  }
  if (formData.employment_type !== undefined) {
    updateData.employment_type = formData.employment_type || null;
  }
  if (formData.category !== undefined) {
    updateData.category = formData.category || null;
  }
  if (formData.job_position !== undefined) {
    updateData.job_position = formData.job_position || null;
  }
  if (formData.father_name !== undefined) {
    updateData.father_name = formData.father_name || null;
  }
  if (formData.cnic !== undefined) {
    updateData.cnic = formData.cnic ? formatCnic(formData.cnic) : null;
  }
  if (formData.address !== undefined) {
    updateData.address = formData.address || null;
  }

  // HR/payroll fields — only super_admin may modify these
  const HR_FIELDS = ["pay_days", "pay_rate", "gross_pay", "basic_salary", "paid_through", "bank_account_no", "bank_branch"] as const;
  const hasHrChange = HR_FIELDS.some((f) => formData[f] !== undefined);
  if (hasHrChange && user.role !== "super_admin") {
    throw new Error("Only administrators can update pay and salary fields");
  }
  if (hasHrChange && user.role === "super_admin") {
    if (formData.pay_days !== undefined) updateData.pay_days = formData.pay_days;
    if (formData.pay_rate !== undefined) updateData.pay_rate = formData.pay_rate;
    if (formData.gross_pay !== undefined) updateData.gross_pay = formData.gross_pay;
    if (formData.basic_salary !== undefined) updateData.basic_salary = formData.basic_salary;
    if (formData.paid_through !== undefined) updateData.paid_through = formData.paid_through || null;
    if (formData.bank_account_no !== undefined) updateData.bank_account_no = formData.bank_account_no || null;
    if (formData.bank_branch !== undefined) updateData.bank_branch = formData.bank_branch || null;
  }

  const { error } = await admin
    .from("users")
    .update(updateData)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function requestPasswordReset(email: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) throw new Error(error.message);
}

export async function resetPassword(password: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) throw new Error(error.message);
}

export async function updatePreferences(formData: { preferred_currency: string }) {
  const user = await requireAuth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      preferred_currency: formData.preferred_currency,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function changePassword(formData: {
  new_password: string;
  confirm_password: string;
}) {
  if (!formData.new_password || formData.new_password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (formData.new_password !== formData.confirm_password) {
    throw new Error("Passwords do not match");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.auth.updateUser({
    password: formData.new_password,
  });

  if (error) throw new Error(error.message);
}

