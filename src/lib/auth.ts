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
    // Auth user exists but no profile row — treat as unauthorised
    // instead of synthesising a fake active user with default role.
    return null;
  }

  return data;
}

export async function requireAuth(): Promise<AppUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.is_active === false) {
    // User is authenticated in Supabase Auth but disabled in app profile
    redirect("/login?inactive=1");
  }
  return appUser;
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  const appUser = await requireAuth();
  if (!roles.includes(appUser.role)) {
    redirect("/dashboard");
  }
  return appUser;
}
