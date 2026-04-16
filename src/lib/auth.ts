import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppUser, UserRole } from "@/lib/types";

/**
 * Cached per-request: resolves the Supabase auth user once,
 * reused across layout → page → server actions within the same request.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Cached per-request: resolves the app profile row once.
 */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data;
});

export async function requireAuth(): Promise<AppUser> {
  const user = await getSession();
  if (!user) redirect("/login");

  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.is_active === false) {
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
