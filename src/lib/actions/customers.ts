"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { sanitizeFilterValue } from "@/lib/utils";

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

function dateOnlyUtcStart(yyyyMmDd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  return `${yyyyMmDd.trim()}T00:00:00.000Z`;
}

function dateOnlyUtcEnd(yyyyMmDd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  return `${yyyyMmDd.trim()}T23:59:59.999Z`;
}

function isMissingSourceColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("source") && (message.includes("column") || message.includes("schema cache"));
}

export async function getCustomers(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Filter by record created from date (UTC day), format YYYY-MM-DD */
  createdFromDate?: string;
  /** Filter by record created to date (UTC day), format YYYY-MM-DD */
  createdToDate?: string;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const applySharedFilters = (query: any) => {
    let next = query;
    if (filters?.search) {
      const safe = sanitizeFilterValue(filters.search);
      next = next.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,account_no.ilike.%${safe}%`);
    }
    if (filters?.createdFromDate?.trim() && filters?.createdToDate?.trim() && filters.createdFromDate === filters.createdToDate) {
      const dayBounds = createdAtDayBoundsUtc(filters.createdFromDate.trim());
      if (dayBounds) {
        next = next.gte("created_at", dayBounds.start).lt("created_at", dayBounds.end);
      }
      return next;
    }
    const fromStart = filters?.createdFromDate?.trim() ? dateOnlyUtcStart(filters.createdFromDate.trim()) : null;
    const toEnd = filters?.createdToDate?.trim() ? dateOnlyUtcEnd(filters.createdToDate.trim()) : null;
    if (fromStart) {
      next = next.gte("created_at", fromStart);
    }
    if (toEnd) {
      next = next.lte("created_at", toEnd);
    }
    return next;
  };

  let query = applySharedFilters(
    supabase
      .from("customers")
      .select("*, created_by_user:users!customers_created_by_fkey(full_name)", { count: "exact" })
      .eq("source", "call_log")
      .order("created_at", { ascending: false }),
  );

  let { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (isMissingSourceColumnError(error)) {
    const { data: salesCustomerRows } = await supabase
      .from("sales")
      .select("customer_id")
      .not("customer_id", "is", null);
    const salesCustomerIds = Array.from(
      new Set((salesCustomerRows || []).map((row: { customer_id: string | null }) => row.customer_id).filter(Boolean)),
    ) as string[];

    let fallbackQuery = applySharedFilters(
      supabase
        .from("customers")
        .select("*, created_by_user:users!customers_created_by_fkey(full_name)", { count: "exact" })
        .order("created_at", { ascending: false }),
    );
    if (salesCustomerIds.length > 0) {
      fallbackQuery = fallbackQuery.not("id", "in", `(${salesCustomerIds.join(",")})`);
    }
    const fallbackResult = await fallbackQuery.range(offset, offset + pageSize - 1);
    data = fallbackResult.data;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

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
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomerSsnForEdit(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("created_by, ssn_encrypted")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  if (user.role === "sales_agent" && data?.created_by !== user.id) {
    throw new Error("You don't have permission to view this SSN");
  }

  return data?.ssn_encrypted ? decrypt(data.ssn_encrypted) || "" : "";
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

  const basePayload: Record<string, unknown> = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    dob: formData.dob || null,
    ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
    account_no: formData.account_no || "",
    created_by: user.id,
  };
  const withSourcePayload = { ...basePayload, source: "call_log" };

  let { data, error } = await supabase
    .from("customers")
    .insert(withSourcePayload)
    .select("id")
    .single();

  if (isMissingSourceColumnError(error)) {
    const retryResult = await supabase
      .from("customers")
      .insert(basePayload)
      .select("id")
      .single();
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Failed to create customer");
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
  await requireAuth();
  const supabase = await createClient();
  const safe = sanitizeFilterValue(query.trim());
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}
