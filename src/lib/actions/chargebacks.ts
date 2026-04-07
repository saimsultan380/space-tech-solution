"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ChargebackStatus } from "@/lib/types";
import { createNotification } from "@/lib/actions/notifications";

export async function getChargebacks(filters?: {
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("chargebacks")
    .select(
      "*, sale:sales(id, company_name, agent_id, customer_name, agent:users!sales_agent_id_fkey(full_name)), assignee:users!chargebacks_assigned_to_fkey(id, full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function createChargeback(formData: {
  sale_id: string;
  date: string;
  reason: string;
  assigned_to: string;
}) {
  const user = await requireRole(["super_admin", "processor", "sales_agent"]);
  const supabase = await createClient();

  if (!formData.assigned_to?.trim()) {
    throw new Error("Please assign this chargeback to a user.");
  }

  const { data: saleRow, error: saleErr } = await supabase
    .from("sales")
    .select("company_name")
    .eq("id", formData.sale_id)
    .single();
  if (saleErr || !saleRow) throw new Error(saleErr?.message || "Sale not found");

  const { error } = await supabase.from("chargebacks").insert({
    sale_id: formData.sale_id,
    date: formData.date,
    reason: formData.reason,
    assigned_to: formData.assigned_to.trim(),
  });

  if (error) throw new Error(error.message);

  await createNotification({
    user_id: formData.assigned_to.trim(),
    title: "New chargeback assigned to you",
    body: `${user.full_name || "Admin"} assigned you a chargeback for sale "${(saleRow as { company_name: string }).company_name}". Open Chargebacks to review.`,
    type: "chargeback",
  });

  revalidatePath("/dashboard/chargebacks");
  revalidatePath("/dashboard");
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
