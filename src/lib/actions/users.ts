"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { UserRole, EmployeeCategory, PaidThrough } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/constants";
import { formatCnic } from "@/lib/utils";

export async function getUsers(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  await requireRole(["super_admin", "processor", "sales_agent"]);
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  
  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function createUser(formData: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  allowedModules?: string[];
  joining_date?: string | null;
  category?: EmployeeCategory;
  department?: string | null;
  job_position?: string | null;
  father_name?: string | null;
  cnic?: string | null;
  address?: string | null;
  pay_days?: number;
  pay_rate?: number;
  gross_pay?: number;
  basic_salary?: number;
  paid_through?: PaidThrough;
  bank_account_no?: string | null;
  bank_branch?: string | null;
}) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  const { error: profileError } = await admin.from("users").insert({
    id: authData.user.id,
    email: formData.email,
    full_name: formData.full_name,
    role: formData.role,
    preferred_currency: "PKR",
    allowed_modules: formData.allowedModules && formData.allowedModules.length > 0 ? formData.allowedModules : null,
    joining_date: formData.joining_date || null,
    category: formData.category || "Permanent",
    department: formData.department || null,
    job_position: formData.job_position || null,
    father_name: formData.father_name || null,
    cnic: formData.cnic ? formatCnic(formData.cnic) : null,
    address: formData.address || null,
    pay_days: formData.pay_days ?? 30,
    pay_rate: formData.pay_rate ?? 0,
    gross_pay: formData.gross_pay ?? 0,
    basic_salary: formData.basic_salary ?? 0,
    paid_through: formData.paid_through || "Bank",
    bank_account_no: formData.bank_account_no || null,
    bank_branch: formData.bank_branch || null,
  });

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/dashboard/users");
  return authData.user;
}

export async function updateUser(
  userId: string,
  formData: {
    email: string;
    full_name: string;
    role: UserRole;
    allowedModules?: string[];
    joining_date?: string | null;
    category?: EmployeeCategory;
    department?: string | null;
    job_position?: string | null;
    father_name?: string | null;
    cnic?: string | null;
    address?: string | null;
    pay_days?: number;
    pay_rate?: number;
    gross_pay?: number;
    basic_salary?: number;
    paid_through?: PaidThrough;
    bank_account_no?: string | null;
    bank_branch?: string | null;
  }
) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id, role, email")
    .eq("id", userId)
    .single();

  if (targetError || !targetUser) {
    throw new Error(targetError?.message || "User not found");
  }

  if (targetUser.email !== formData.email) {
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
      email: formData.email,
      email_confirm: true,
    });
    if (authUpdateError) throw new Error(authUpdateError.message);
  }

  const roleModules = NAV_ITEMS[formData.role] || [];
  const allowedSet = new Set(roleModules.map((item) => item.href));
  const nextModules = Array.from(new Set(formData.allowedModules ?? [])).filter((href) => allowedSet.has(href));

  const updateData: Record<string, unknown> = {
    email: formData.email,
    full_name: formData.full_name,
    role: formData.role,
    allowed_modules: nextModules.length > 0 ? nextModules : null,
  };

  if (formData.joining_date !== undefined) updateData.joining_date = formData.joining_date;
  if (formData.category !== undefined) updateData.category = formData.category;
  if (formData.department !== undefined) updateData.department = formData.department;
  if (formData.job_position !== undefined) updateData.job_position = formData.job_position;
  if (formData.father_name !== undefined) updateData.father_name = formData.father_name;
  if (formData.cnic !== undefined) updateData.cnic = formData.cnic ? formatCnic(formData.cnic) : null;
  if (formData.address !== undefined) updateData.address = formData.address;
  if (formData.pay_days !== undefined) updateData.pay_days = formData.pay_days;
  if (formData.pay_rate !== undefined) updateData.pay_rate = formData.pay_rate;
  if (formData.gross_pay !== undefined) updateData.gross_pay = formData.gross_pay;
  if (formData.basic_salary !== undefined) updateData.basic_salary = formData.basic_salary;
  if (formData.paid_through !== undefined) updateData.paid_through = formData.paid_through;
  if (formData.bank_account_no !== undefined) updateData.bank_account_no = formData.bank_account_no;
  if (formData.bank_branch !== undefined) updateData.bank_branch = formData.bank_branch;

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/payslips");
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/users");
}

export async function updateUserAllowedModules(userId: string, allowedModules: string[]) {
  const currentUser = await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (targetError || !targetUser) {
    throw new Error(targetError?.message || "User not found");
  }

  const roleModules = NAV_ITEMS[targetUser.role as UserRole] || [];
  const allowedSet = new Set(roleModules.map((item) => item.href));
  const nextModules = Array.from(new Set(allowedModules)).filter((href) => allowedSet.has(href));

  if (
    userId === currentUser.id &&
    nextModules.length > 0 &&
    !nextModules.includes("/dashboard/settings")
  ) {
    nextModules.push("/dashboard/settings");
  }

  const { error } = await supabase
    .from("users")
    .update({ allowed_modules: nextModules.length > 0 ? nextModules : null })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/users");
}

export async function deleteUser(userId: string) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  // Remove profile row first (will cascade auth or keep orphan auth depending on rules)
  const { error: profileError } = await admin.from("users").delete().eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  // Then remove auth user
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  revalidatePath("/dashboard/users");
}
