import { createClient } from "@/lib/supabase/client";
import { sanitizeFilterValue } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

export async function getUsers(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{
  data: AppUser[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("users")
    .select("id, email, full_name, role, is_active, created_at, avatar_url, preferred_currency, allowed_modules, joining_date, category, department, job_position, father_name, cnic, address, pay_days, pay_rate, gross_pay, basic_salary, paid_through, bank_account_no, bank_branch, bank_name, employee_id", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    const safe = sanitizeFilterValue(filters.search);
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  
  return {
    data: (data || []) as AppUser[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
