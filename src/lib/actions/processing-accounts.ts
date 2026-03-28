"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import type { ProcessingAccountStatus } from "@/lib/types";

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

export async function getProcessingAccountStats(): Promise<ProcessingAccountStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("processing_accounts")
    .select("status");

  if (error) throw new Error(error.message);

  const accounts = data || [];
  return {
    total: accounts.length,
    active: accounts.filter((a) => a.status === "active").length,
    not_working: accounts.filter((a) => a.status === "not_working").length,
    closed: accounts.filter((a) => a.status === "closed").length,
    reversal_issue: accounts.filter((a) => a.status === "reversal_issue").length,
    under_review: accounts.filter((a) => a.status === "under_review").length,
  };
}

export async function getProcessingAccounts(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProcessingAccountStatus | "all";
}) {
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("processing_accounts")
    .select("*, creator:users!processing_accounts_created_by_fkey(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `account_holder_name.ilike.%${filters.search}%,billing_address.ilike.%${filters.search}%`
    );
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  const accounts = (data || []).map((account) => ({
    ...account,
    routing_number: safeDecrypt(account.routing_number_encrypted as string),
    account_number: safeDecrypt(account.account_number_encrypted as string),
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
  };
}

export async function createProcessingAccount(formData: {
  account_holder_name: string;
  routing_number: string;
  account_number: string;
  billing_address: string;
  status: ProcessingAccountStatus;
  notes?: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("processing_accounts")
    .insert({
      account_holder_name: formData.account_holder_name.trim() || "",
      routing_number_encrypted: encrypt(formData.routing_number.trim()),
      account_number_encrypted: encrypt(formData.account_number.trim()),
      billing_address: formData.billing_address.trim() || "",
      status: formData.status,
      notes: formData.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProcessingAccountsPaths();
  return data.id as string;
}

export async function updateProcessingAccount(
  id: string,
  formData: {
    account_holder_name: string;
    routing_number: string;
    account_number: string;
    billing_address: string;
    status: ProcessingAccountStatus;
    notes?: string;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    account_holder_name: formData.account_holder_name.trim(),
    routing_number_encrypted: encrypt(formData.routing_number.trim()),
    account_number_encrypted: encrypt(formData.account_number.trim()),
    billing_address: formData.billing_address.trim(),
    status: formData.status,
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
