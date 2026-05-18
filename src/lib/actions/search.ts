"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { sanitizeFilterValue } from "@/lib/utils";

export async function globalSearch(term: string) {
  await requireAuth();
  const supabase = await createClient();

  const q = term.trim();
  if (!q) {
    return {
      customers: [],
      sales: [],
      payments: [],
      users: [],
      chargebacks: [],
    };
  }

  const safe = sanitizeFilterValue(q);
  const like = `%${safe}%`;

  const { data: saleCustomerMatches } = await supabase
    .from("customers")
    .select("id")
    .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(100);
  const saleCustomerIds = saleCustomerMatches?.map((r: { id: string }) => r.id) ?? [];
  const salesSearchOr =
    saleCustomerIds.length > 0
      ? `company_name.ilike.${like},customer_id.in.(${saleCustomerIds.join(",")})`
      : `company_name.ilike.${like}`;

  const [customersRes, salesRes, paymentsRes, usersRes, chargebacksRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, created_at")
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(10),
    supabase
      .from("sales")
      .select("id, company_name, status, sale_type, subtype, charged_amount, created_at, customer:customers(name)")
      .or(salesSearchOr)
      .limit(10),
    supabase
      .from("payments")
      .select("id, method, amount, created_at, customer:customers(id, name), sale:sales(id, company_name)")
      .or(`sale_id.in.(${(saleCustomerIds.length > 0 ? saleCustomerIds : []).join(",")})`)
      .limit(10),
    supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .or(`full_name.ilike.${like},email.ilike.${like}`)
      .limit(10),
    supabase
      .from("chargebacks")
      .select("id, reason, status, date, sale:sales(id, company_name)")
      .or(`reason.ilike.${like}`)
      .limit(10),
  ]);

  return {
    customers: customersRes.data || [],
    sales: salesRes.data || [],
    payments: paymentsRes.data || [],
    users: usersRes.data || [],
    chargebacks: chargebacksRes.data || [],
  };
}

