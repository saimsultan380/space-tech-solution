"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type MerchantName = {
  id: string;
  name: string;
};

function refresh() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/merchant-charges");
}

export async function listMerchantNames(): Promise<MerchantName[]> {
  await requireRole(["super_admin", "sales_agent", "processor", "merchant"]);
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("merchant_names")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as MerchantName[];
}

export async function createMerchantName(name: string): Promise<MerchantName[]> {
  await requireRole(["super_admin"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a merchant name.");
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("merchant_names").insert({ name: trimmed });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (error.code === "23505" || message.includes("duplicate") || message.includes("unique")) {
      throw new Error("That merchant name is already saved.");
    }
    throw new Error(error.message);
  }
  refresh();
  return listMerchantNames();
}

export async function deleteMerchantName(id: string): Promise<MerchantName[]> {
  await requireRole(["super_admin"]);
  if (!id) throw new Error("Missing merchant name.");
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("merchant_names").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  return listMerchantNames();
}
