"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PersonalNote } from "@/lib/types";

export async function getPersonalNotes(): Promise<PersonalNote[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching personal notes:", error);
    return [];
  }

  return data as PersonalNote[];
}

export async function createPersonalNote(payload: {
  title?: string;
  content: string;
  color?: string;
  pinned?: boolean;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_notes")
    .insert({
      user_id: user.id,
      title: payload.title || null,
      content: payload.content,
      color: payload.color || "gray",
      pinned: payload.pinned || false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating personal note:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as PersonalNote };
}

export async function updatePersonalNote(
  id: string,
  payload: Partial<Omit<PersonalNote, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_notes")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating personal note:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as PersonalNote };
}

export async function deletePersonalNote(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("personal_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting personal note:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
}

export async function togglePinNote(id: string, pinned: boolean) {
  return updatePersonalNote(id, { pinned });
}
