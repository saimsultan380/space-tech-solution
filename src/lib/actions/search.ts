"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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

  const like = `%${q}%`;

  const [customersRes, salesRes, paymentsRes, usersRes, chargebacksRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, created_at")
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(10),
    supabase
      .from("sales")
      .select("id, company_name, status, sale_type, subtype, charged_amount, created_at, customer:customers(name)")
      .or(`company_name.ilike.${like}`)
      .limit(10),
    supabase
      .from("payments")
      .select("id, method, amount, created_at, customer:customers(id, name), sale:sales(id, company_name)")
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

