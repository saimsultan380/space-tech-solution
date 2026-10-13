import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppUser, UserRole } from "@/lib/types";

/** Columns needed for layout / role gates on every dashboard navigation. */
const APP_USER_LITE_SELECT =
  "id, email, full_name, role, employee_id, is_active, created_at, avatar_url, preferred_currency, allowed_modules";

/** Full profile — only when a page needs payroll/HR fields. */
const APP_USER_FULL_SELECT =
  "id, email, full_name, role, employee_id, is_active, created_at, avatar_url, preferred_currency, allowed_modules, department, company_name, education_degree, joining_date, employment_type, category, job_position, father_name, cnic, address, pay_days, pay_rate, gross_pay, basic_salary, paid_through, bank_account_no, bank_branch, bank_name";

/**
 * Cached per-request: reads the auth user from the session cookie (no Auth API roundtrip).
 * Matches middleware's getSession() approach — getUser() adds 200–2700ms per navigation.
 * Mutating server actions still rely on RLS + role checks; call verifyAuthUser() when
 * a live Auth-server check is required.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

/**
 * Validates the JWT with Supabase Auth (network call). Use for sensitive mutations
 * when cookie-only session checks are not enough.
 */
export const verifyAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Cached per-request: slim profile for layout/navigation (avoids pulling payroll columns
 * on every page load).
 */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(APP_USER_LITE_SELECT)
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return { ...data, role: data.role as UserRole } as AppUser;
});

/** Full user row when a page needs HR/payroll fields. */
export const getAppUserFull = cache(async (): Promise<AppUser | null> => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(APP_USER_FULL_SELECT)
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return { ...data, role: data.role as UserRole } as AppUser;
});

export async function requireAuth(): Promise<AppUser> {
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
