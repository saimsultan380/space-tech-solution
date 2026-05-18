"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Note } from "@/lib/types";

export async function getNotes(params: { sale_id?: string; customer_id?: string; type?: string }) {
  await requireAuth();
  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select("id, content, created_at, updated_at, is_important, type, sale_id, customer_id, user_id, user:users(id, full_name, role)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.sale_id) {
    query = query.eq("sale_id", params.sale_id);
  }
  if (params.customer_id) {
    query = query.eq("customer_id", params.customer_id);
  }
  if (params.type) {
    query = query.eq("type", params.type);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  // Normalize the user field from array to object
  return (data || []).map((note) => ({
    ...note,
    user: Array.isArray(note.user) ? note.user[0] ?? null : note.user ?? null,
  })) as Note[];
}

export async function createNote(formData: {
  content: string;
  sale_id?: string;
  customer_id?: string;
  is_important?: boolean;
  type?: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("notes").insert({
    content: formData.content,
    sale_id: formData.sale_id || null,
    customer_id: formData.customer_id || null,
    user_id: user.id,
    is_important: formData.is_important || false,
    type: formData.type || null,
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

export async function updateNote(noteId: string, content: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({ content: content.trim() })
    .eq("id", noteId);

  if (error) throw new Error(error.message);
}
