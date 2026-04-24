"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import type { ProcessingAccountImportPayload, ProcessingAccountStatus, ProcessingAccountType } from "@/lib/types";
import { sanitizeFilterValue } from "@/lib/utils";

function safeDecrypt(ciphertext: string | null | undefined): string {
  if (!ciphertext?.trim()) return "";
  try {
    return decrypt(ciphertext) || "";
  } catch {
    return "";
  }
}

function revalidateProcessingAccountsPaths() {
  revalidatePath("/dashboard/processing-accounts");
}

export interface ProcessingAccountStats {
  total: number;
  active: number;
  not_working: number;
  closed: number;
  reversal_issue: number;
  under_review: number;
}

export async function getProcessingAccountStats(filters?: {
  search?: string;
  from_date?: string;
  to_date?: string;
}): Promise<ProcessingAccountStats> {
  await requireAuth();
  const supabase = await createClient();

  const statuses = ["active", "not_working", "closed", "reversal_issue", "under_review"] as const;
  
  const applyFilters = (query: any) => {
    let next = query;
    if (filters?.search) {
      const safe = sanitizeFilterValue(filters.search);
      next = next.or(`account_holder_name.ilike.%${safe}%,billing_address.ilike.%${safe}%,notes.ilike.%${safe}%`);
    }
    if (filters?.from_date) {
      next = next.gte("created_at", `${filters.from_date}T00:00:00.000Z`);
    }
    if (filters?.to_date) {
      next = next.lte("created_at", `${filters.to_date}T23:59:59.999Z`);
    }
    return next;
  };

  const [totalRes, ...statusRes] = await Promise.all([
    applyFilters(supabase.from("processing_accounts").select("id", { count: "exact", head: true })),
    ...statuses.map((s) =>
      applyFilters(supabase.from("processing_accounts").select("id", { count: "exact", head: true }).eq("status", s))
    ),
  ]);

  return {
    total: totalRes.count || 0,
    active: statusRes[0].count || 0,
    not_working: statusRes[1].count || 0,
    closed: statusRes[2].count || 0,
    reversal_issue: statusRes[3].count || 0,
    under_review: statusRes[4].count || 0,
  };
}

export async function getProcessingAccounts(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProcessingAccountStatus | "all";
  from_date?: string;
  to_date?: string;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("processing_accounts")
    .select("*, creator:users!processing_accounts_created_by_fkey(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    const safe = sanitizeFilterValue(filters.search);
    query = query.or(
      `account_holder_name.ilike.%${safe}%,billing_address.ilike.%${safe}%,notes.ilike.%${safe}%`
    );
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.from_date) {
    query = query
      .gte("created_at", `${filters.from_date}T00:00:00.000Z`);
  }
  if (filters?.to_date) {
    query = query
      .lte("created_at", `${filters.to_date}T23:59:59.999Z`);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const accounts = (data || []).map((account) => ({
    ...account,
    routing_number: safeDecrypt(account.routing_number_encrypted as string),
    account_number: safeDecrypt(account.account_number_encrypted as string),
    card_number: safeDecrypt(account.card_number_encrypted as string),
    cvv: safeDecrypt(account.cvv_encrypted as string),
    expiration_date: account.expiration_date || "",
    account_type: (account.account_type as ProcessingAccountType) || "checkin",
  }));

  return {
    data: accounts,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getProcessingAccount(id: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processing_accounts")
    .select("*, creator:users!processing_accounts_created_by_fkey(id, full_name)")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  return {
    ...data,
    routing_number: safeDecrypt(data.routing_number_encrypted),
    account_number: safeDecrypt(data.account_number_encrypted),
    card_number: safeDecrypt(data.card_number_encrypted),
    cvv: safeDecrypt(data.cvv_encrypted),
    expiration_date: data.expiration_date || "",
    account_type: (data.account_type as ProcessingAccountType) || "checkin",
  };
}

export async function createProcessingAccount(formData: {
  account_type: ProcessingAccountType | "";
  account_holder_name: string;
  routing_number?: string;
  account_number?: string;
  card_number?: string;
  expiration_date?: string;
  cvv?: string;
  billing_address: string;
  status: ProcessingAccountStatus | "";
  notes?: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const isCard = formData.account_type === "card";

  const { data, error } = await supabase
    .from("processing_accounts")
    .insert({
      account_type: formData.account_type || "checkin",
      account_holder_name: formData.account_holder_name.trim() || "",
      routing_number_encrypted: isCard ? encrypt("") : encrypt((formData.routing_number || "").trim()),
      account_number_encrypted: isCard ? encrypt("") : encrypt((formData.account_number || "").trim()),
      card_number_encrypted: isCard ? encrypt((formData.card_number || "").trim()) : null,
      expiration_date: isCard ? (formData.expiration_date || null) : null,
      cvv_encrypted: isCard ? encrypt((formData.cvv || "").trim()) : null,
      billing_address: formData.billing_address.trim() || "",
      status: formData.status || null,
      notes: formData.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProcessingAccountsPaths();
  return data.id as string;
}

const IMPORT_STATUS_SET = new Set<ProcessingAccountStatus>([
  "active",
  "not_working",
  "closed",
  "reversal_issue",
  "under_review",
]);

const MAX_IMPORT_ROWS = 500;

export async function bulkImportProcessingAccounts(
  rows: ProcessingAccountImportPayload[]
): Promise<{ inserted: number; error?: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  if (!rows.length) {
    return { inserted: 0 };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      inserted: 0,
      error: `Too many rows. Maximum ${MAX_IMPORT_ROWS} per import.`,
    };
  }

  const records = rows.map((r) => {
    const status =
      r.status && IMPORT_STATUS_SET.has(r.status as ProcessingAccountStatus)
        ? r.status
        : null;
    const isCard = r.account_type === "card";
    return {
      account_type: r.account_type || "checkin",
      account_holder_name: (r.account_holder_name || "").trim(),
      routing_number_encrypted: isCard ? encrypt("") : encrypt((r.routing_number || "").trim()),
      account_number_encrypted: isCard ? encrypt("") : encrypt((r.account_number || "").trim()),
      card_number_encrypted: isCard ? encrypt((r.card_number || "").trim()) : null,
      expiration_date: isCard ? (r.expiration_date || null) : null,
      cvv_encrypted: isCard ? encrypt((r.cvv || "").trim()) : null,
      billing_address: (r.billing_address || "").trim(),
      status,
      notes: r.notes?.trim() ? r.notes.trim() : null,
      created_by: user.id,
    };
  });

  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from("processing_accounts").insert(chunk);
    if (error) {
      return {
        inserted,
        error:
          inserted > 0
            ? `${error.message} (${inserted} rows were imported before this error.)`
            : error.message,
      };
    }
    inserted += chunk.length;
  }

  revalidateProcessingAccountsPaths();
  return { inserted };
}

export async function updateProcessingAccount(
  id: string,
  formData: {
    account_type: ProcessingAccountType | "";
    account_holder_name: string;
    routing_number?: string;
    account_number?: string;
    card_number?: string;
    expiration_date?: string;
    cvv?: string;
    billing_address: string;
    status: ProcessingAccountStatus | "";
    notes?: string;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const isCard = formData.account_type === "card";

  const updateData: Record<string, unknown> = {
    account_type: formData.account_type || "checkin",
    account_holder_name: formData.account_holder_name.trim(),
    routing_number_encrypted: isCard ? encrypt("") : encrypt((formData.routing_number || "").trim()),
    account_number_encrypted: isCard ? encrypt("") : encrypt((formData.account_number || "").trim()),
    card_number_encrypted: isCard ? encrypt((formData.card_number || "").trim()) : null,
    expiration_date: isCard ? (formData.expiration_date || null) : null,
    cvv_encrypted: isCard ? encrypt((formData.cvv || "").trim()) : null,
    billing_address: formData.billing_address.trim(),
    status: formData.status || null,
    notes: formData.notes?.trim() ? formData.notes.trim() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("processing_accounts")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateProcessingAccountsPaths();
}

export async function deleteProcessingAccount(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("processing_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProcessingAccountsPaths();
}

export async function notifyAdminAboutAccount(
  accountId: string,
  message: string
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: admins, error: adminError } = await supabase
    .from("users")
    .select("id")
    .eq("role", "super_admin")
    .eq("is_active", true);

  if (adminError) throw new Error(adminError.message);

  const { data: account } = await supabase
    .from("processing_accounts")
    .select("account_holder_name, status")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  const notifications = (admins || []).map((admin) => ({
    user_id: admin.id,
    title: "Processing Account Alert",
    body: `${user.full_name} flagged account "${account.account_holder_name}" (${account.status}): ${message}`,
    type: "processing_account_alert",
    is_read: false,
  }));

  if (notifications.length > 0) {
    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) throw new Error(notifError.message);
  }

  revalidateProcessingAccountsPaths();
  return { success: true };
}
