"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/constants";

export async function getUsers() {
  await requireRole(["super_admin", "processor", "sales_agent"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createUser(formData: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  allowedModules?: string[];
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

  const { error } = await supabase
    .from("users")
    .update({
      email: formData.email,
      full_name: formData.full_name,
      role: formData.role,
      allowed_modules: nextModules.length > 0 ? nextModules : null,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/users");
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
