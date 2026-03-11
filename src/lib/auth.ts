import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppUser, UserRole } from "@/lib/types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // Auth user exists but no profile row yet — return a fallback
    // so we don't redirect to /login and cause an infinite loop
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.email?.split("@")[0] ?? "User",
      role: "sales_agent",
      is_active: true,
      created_at: new Date().toISOString(),
      avatar_url: null,
      preferred_currency: "PKR",
      allowed_modules: null,
    };
  }

  return data;
}

export async function requireAuth(): Promise<AppUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  return appUser;
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  const appUser = await requireAuth();
  if (!roles.includes(appUser.role)) {
    redirect("/dashboard");
  }
  return appUser;
}
