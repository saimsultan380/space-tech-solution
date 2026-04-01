"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getBanks(): Promise<{ id: string; name: string }[]> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.from("banks").select("id, name").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createBank(name: string): Promise<{ id: string; name: string }> {
  await requireRole(["super_admin"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Bank name is required");

  const supabase = await createClient();
  const { data, error } = await supabase.from("banks").insert({ name: trimmed }).select("id, name").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase.from("banks").select("id, name").eq("name", trimmed).maybeSingle();
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  revalidatePath("/dashboard/users");
  return data;
}
