"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ChargebackStatus } from "@/lib/types";

export async function getChargebacks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chargebacks")
    .select("*, sale:sales(id, company_name, agent_id, agent:users!sales_agent_id_fkey(full_name))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createChargeback(formData: {
  sale_id: string;
  date: string;
  reason: string;
}) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase.from("chargebacks").insert({
    sale_id: formData.sale_id,
    date: formData.date,
    reason: formData.reason,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/chargebacks");
}

export async function updateChargebackStatus(id: string, status: ChargebackStatus) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("chargebacks")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/chargebacks");
}

export async function deleteChargeback(id: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase.from("chargebacks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/chargebacks");
}
