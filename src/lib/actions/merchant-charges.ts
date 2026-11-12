"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { getDecryptedCardSecrets } from "@/lib/payment-secrets";
import { revalidatePath } from "next/cache";
import type { ChargeRequestStatus, SaleChargeRequest } from "@/lib/types";

const CHARGE_STATUSES = new Set(["pending", "viewed", "charging", "approved", "declined"]);

export async function getActiveMerchants() {
  await requireRole(["super_admin", "sales_agent", "processor"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "merchant")
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: string; full_name: string }>;
}

function mapChargeRow(row: any): SaleChargeRequest {
  return {
    id: row.id,
    sale_id: row.sale_id,
    agent_id: row.agent_id,
    merchant_user_id: row.merchant_user_id,
    status: row.status,
    viewed_at: row.viewed_at,
    charging_at: row.charging_at,
    decided_at: row.decided_at,
    decline_reason: row.decline_reason,
    remarks: row.remarks ?? row.decline_reason ?? null,
    created_at: row.created_at,
    charge_first_name: row.sale?.charge_first_name ?? null,
    charge_last_name: row.sale?.charge_last_name ?? null,
    charge_amount: row.sale?.charge_amount ?? null,
    charge_phone: row.sale?.charge_phone ?? null,
    charge_email: row.sale?.charge_email ?? null,
    merchant_name:
      row.status === "approved" && row.sale?.merchant_name
        ? row.sale.merchant_name
        : row.merchant?.full_name ?? row.merchant_name ?? null,
    agent_name: row.agent?.full_name ?? row.agent_name ?? null,
    company_name: row.sale?.company_name ?? row.company_name ?? null,
    customer_name: row.sale?.customer_name ?? row.customer_name ?? null,
    charged_amount: row.sale?.charged_amount ?? row.charged_amount ?? null,
  };
}

export async function listMerchantChargeRequests(): Promise<SaleChargeRequest[]> {
  const user = await requireRole(["merchant", "super_admin"]);
  const admin = createAdminClient() as any;
  let query = admin
    .from("sale_charge_requests")
    .select(
      "id, sale_id, agent_id, merchant_user_id, status, viewed_at, charging_at, decided_at, decline_reason, remarks, created_at, agent:users!sale_charge_requests_agent_id_fkey(full_name), merchant:users!sale_charge_requests_merchant_user_id_fkey(full_name), sale:sales(company_name, customer_name, charged_amount, charge_first_name, charge_last_name, charge_amount, charge_phone, charge_email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (user.role === "merchant") {
    query = query.or(`merchant_user_id.eq.${user.id},merchant_user_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(mapChargeRow);
}

export async function getSaleChargeRequest(saleId: string): Promise<SaleChargeRequest | null> {
  await requireAuth();
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("sale_charge_requests")
    .select(
      "id, sale_id, agent_id, merchant_user_id, status, viewed_at, charging_at, decided_at, decline_reason, remarks, created_at, merchant:users!sale_charge_requests_merchant_user_id_fkey(full_name), sale:sales(merchant_name)",
    )
    .eq("sale_id", saleId)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return mapChargeRow(data);
}

async function loadChargeForActor(id: string) {
  const user = await requireRole(["merchant", "super_admin"]);
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("sale_charge_requests")
    .select(
      "id, sale_id, agent_id, merchant_user_id, status, viewed_at, charging_at, decided_at, decline_reason, remarks, created_at, agent:users!sale_charge_requests_agent_id_fkey(full_name), merchant:users!sale_charge_requests_merchant_user_id_fkey(full_name), sale:sales(company_name, customer_name, charged_amount, customer_phone, status, discount, merchant_name, charge_first_name, charge_last_name, charge_amount, charge_phone, charge_email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Charge request not found");
  if (user.role === "merchant" && data.merchant_user_id && data.merchant_user_id !== user.id) {
    throw new Error("This request is assigned to another merchant");
  }
  return { user, row: data, admin };
}

async function notifyAgent(row: any, title: string, body: string, type: string) {
  await createNotification({
    user_id: row.agent_id,
    title,
    body,
    type,
    href: `/dashboard/sales/${row.sale_id}`,
  });
}

export async function openMerchantChargeRequest(id: string) {
  const { user, row } = await loadChargeForActor(id);
  const previous = row.status as ChargeRequestStatus;
  if (user.role === "merchant" && previous === "pending") {
    const supabase = (await createClient()) as any;
    const { error } = await supabase.rpc("transition_sale_charge_request", {
      p_id: id,
      p_next: "viewed",
      p_reason: null,
    });
    if (error) throw new Error(error.message);
    const company = row.sale?.company_name || "a sale";
    await notifyAgent(
      row,
      "Merchant viewed the request",
      `${user.full_name} opened the card charge for ${company}.`,
      "charge_viewed",
    );
  }

  const fresh = await loadChargeForActor(id);
  const card = await loadCardForCharge(fresh.admin, fresh.row);
  revalidatePath("/dashboard/merchant-charges");
  revalidatePath(`/dashboard/sales/${row.sale_id}`);
  return { request: mapChargeRow(fresh.row), card };
}

async function loadCardForCharge(admin: any, row: any) {
  const { data: payment } = await admin
    .from("payments")
    .select("method, encrypted_details, card_cvv_encrypted, card_exp, billing_address, card_last_four")
    .eq("sale_id", row.sale_id)
    .eq("method", "card")
    .order("charge_card", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return { cardNumber: "", cardCvv: "", cardExp: "", billingAddress: "", cardLastFour: "" };
  }
  const secrets = getDecryptedCardSecrets(payment);
  return {
    cardNumber: secrets.cardNumber,
    cardCvv: secrets.cardCvv,
    cardExp: payment.card_exp || "",
    billingAddress: payment.billing_address || "",
    cardLastFour: payment.card_last_four || "",
  };
}

async function applyChargeDecision(
  row: any,
  next: "approved" | "declined",
  merchantName: string,
) {
  const admin = createAdminClient() as any;
  const sale = row.sale || {};
  if (next === "declined") {
    if (sale.status === "pending") {
      const { error } = await admin.from("sales").update({ status: "rejected" }).eq("id", row.sale_id);
      if (error) throw new Error(error.message);
    }
    return;
  }

  const name = [sale.charge_first_name, sale.charge_last_name]
    .map((part: string | null) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  const patch: Record<string, unknown> = {};
  if (sale.status === "pending") patch.status = "approved";
  if (name) patch.customer_name = name;
  if (sale.charge_phone) patch.customer_phone = sale.charge_phone;
  if (sale.charge_email) patch.customer_email = sale.charge_email;
  if (sale.charge_amount != null && sale.charge_amount !== "") {
    const amount = Number(sale.charge_amount);
    const discount = Number(sale.discount || 0);
    if (Number.isFinite(amount)) {
      patch.amount = amount;
      patch.charged_amount = amount - (Number.isFinite(discount) ? discount : 0);
    }
  }
  if (merchantName) patch.merchant_name = merchantName;
  if (Object.keys(patch).length === 0) return;
  const { error } = await admin.from("sales").update(patch).eq("id", row.sale_id);
  if (error) throw new Error(error.message);
}

export async function transitionMerchantCharge(
  id: string,
  next: "charging" | "approved" | "declined",
  reason?: string,
  merchantCompanyName?: string,
) {
  if (!CHARGE_STATUSES.has(next)) throw new Error("Invalid status");
  const { user, row } = await loadChargeForActor(id);
  if (user.role !== "merchant" || (row.merchant_user_id && row.merchant_user_id !== user.id)) {
    throw new Error("Only the assigned merchant can charge this card");
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase.rpc("transition_sale_charge_request", {
    p_id: id,
    p_next: next,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  const companyName = merchantCompanyName?.trim() || "";
  if (next === "approved" && !companyName) {
    throw new Error("Enter the merchant name before approving.");
  }
  if (next === "approved" || next === "declined") {
    await applyChargeDecision(row, next, companyName);
  }
  if (next === "approved" && companyName) {
    const admin = createAdminClient() as any;
    const { error: paymentError } = await admin
      .from("payments")
      .update({ merchant_name: companyName })
      .eq("sale_id", row.sale_id);
    if (paymentError) throw new Error(paymentError.message);
  }

  const company = row.sale?.company_name || "the sale";
  const amount = row.sale?.charged_amount;
  const amountText = amount != null ? `$${Number(amount).toFixed(2)}` : "";
  if (next === "charging") {
    await notifyAgent(
      row,
      "Charge in progress",
      `${user.full_name} is charging ${company}${amountText ? ` (${amountText})` : ""}.`,
      "charge_charging",
    );
  } else if (next === "approved") {
    await notifyAgent(
      row,
      "Charge approved",
      `The card charge for ${company} was approved. The sale details were added.`,
      "charge_approved",
    );
  } else {
    await notifyAgent(
      row,
      "Charge declined",
      `The card charge for ${company} was declined. ${reason?.trim() || ""}`.trim(),
      "charge_declined",
    );
  }

  revalidatePath("/dashboard/merchant-charges");
  revalidatePath(`/dashboard/merchant-charges/${id}`);
  revalidatePath(`/dashboard/sales/${row.sale_id}`);
  revalidatePath("/dashboard/sales");
}
