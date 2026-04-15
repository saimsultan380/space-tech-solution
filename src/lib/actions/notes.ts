"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getNotes(params: { sale_id?: string; customer_id?: string }) {
  await requireAuth();
  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select("*, user:users(id, full_name, role)")
    .order("created_at", { ascending: false });

  if (params.sale_id) {
    query = query.eq("sale_id", params.sale_id);
  }
  if (params.customer_id) {
    query = query.eq("customer_id", params.customer_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createNote(formData: {
  content: string;
  sale_id?: string;
  customer_id?: string;
  is_important?: boolean;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("notes").insert({
    content: formData.content,
    sale_id: formData.sale_id || null,
    customer_id: formData.customer_id || null,
    user_id: user.id,
    is_important: formData.is_important || false,
  });

  if (error) throw new Error(error.message);

  if (formData.sale_id) revalidatePath(`/dashboard/sales/${formData.sale_id}`);
  if (formData.customer_id) {
    revalidatePath(`/dashboard/call-logs-responses/${formData.customer_id}`);
    revalidatePath(`/dashboard/customers/${formData.customer_id}`);
  }
}

export async function toggleNoteImportance(noteId: string, isImportant: boolean) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({ is_important: isImportant })
    .eq("id", noteId);

  if (error) throw new Error(error.message);
}

export async function deleteNote(noteId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
}
