"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

function revalidateCallLogsResponsesPaths() {
  revalidatePath("/dashboard/call-logs-responses");
  revalidatePath("/dashboard/customers");
}

function createdAtDayBoundsUtc(yyyyMmDd: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  const [y, m, d] = yyyyMmDd.trim().split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const start = `${yyyyMmDd.trim()}T00:00:00.000Z`;
  const endUtc = new Date(Date.UTC(y, m - 1, d + 1));
  const end = endUtc.toISOString();
  return { start, end };
}

export async function getCustomers(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Filter by record created date (UTC calendar day), format YYYY-MM-DD */
  createdDate?: string;
}) {
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("customers")
    .select("*, created_by_user:users!customers_created_by_fkey(full_name)", { count: "exact" })
    .eq("source", "call_log")
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const dayBounds = filters?.createdDate?.trim() ? createdAtDayBoundsUtc(filters.createdDate.trim()) : null;
  if (dayBounds) {
    query = query.gte("created_at", dayBounds.start).lt("created_at", dayBounds.end);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const customers = (data || []) as Array<{ id: string } & Record<string, unknown>>;
  const ids = customers.map((c) => c.id).filter(Boolean);

  let recentNoteByCustomerId = new Map<string, { content: string; created_at: string }>();
  if (ids.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from("notes")
      .select("customer_id, content, created_at")
      .in("customer_id", ids)
      .order("created_at", { ascending: false });

    if (notesError) throw new Error(notesError.message);

    (notesData || []).forEach((n: { customer_id: string | null; content: string; created_at: string }) => {
      if (!n.customer_id) return;
      if (!recentNoteByCustomerId.has(n.customer_id)) {
        recentNoteByCustomerId.set(n.customer_id, { content: n.content, created_at: n.created_at });
      }
    });
  }

  const enriched = customers.map((c) => {
    const recent = recentNoteByCustomerId.get(c.id) || null;
    return {
      ...c,
      recent_note: recent?.content || null,
      recent_note_created_at: recent?.created_at || null,
    };
  });

  return {
    data: enriched,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCustomer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createCustomer(formData: {
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  ssn: string;
  account_no: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      dob: formData.dob || null,
      ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
      account_no: formData.account_no || "",
      source: "call_log",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateCallLogsResponsesPaths();
  return data.id as string;
}

export async function updateCustomer(
  id: string,
  formData: {
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    ssn?: string;
    account_no?: string;
  }
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Explicit ownership/admin check for security
  if (user.role === "sales_agent") {
    const { data: existing } = await supabase
      .from("customers")
      .select("created_by")
      .eq("id", id)
      .single();
    if (existing && existing.created_by !== user.id) {
      throw new Error("You don't have permission to update this customer");
    }
  }

  const updateData: Record<string, unknown> = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    dob: formData.dob || null,
    account_no: formData.account_no || "",
  };

  if (formData.ssn) {
    updateData.ssn_encrypted = encrypt(formData.ssn);
  }

  const { error } = await supabase
    .from("customers")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateCallLogsResponsesPaths();
}

export async function deleteCustomer(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Explicit ownership/admin check for security
  if (user.role === "sales_agent") {
    const { data: existing } = await supabase
      .from("customers")
      .select("created_by")
      .eq("id", id)
      .single();
    if (existing && existing.created_by !== user.id) {
      throw new Error("You don't have permission to delete this customer");
    }
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCallLogsResponsesPaths();
}

export async function searchCustomers(query: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}
