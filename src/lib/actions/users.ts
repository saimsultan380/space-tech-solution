"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types";

export async function getUsers() {
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
