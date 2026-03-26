"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getAgentNames() {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_names")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAgentName(name: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Agent name is required");

  const { data, error } = await supabase
    .from("agent_names")
    .insert({ name: trimmed })
    .select("id, name, created_at")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales/new");
  revalidatePath("/dashboard/sales");
  return data as { id: string; name: string; created_at: string };
}

