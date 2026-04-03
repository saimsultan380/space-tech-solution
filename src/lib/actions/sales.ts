"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import type { SaleStatus } from "@/lib/types";

export async function getSales(filters?: {
  status?: string;
  sale_type?: string;
  agent_id?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("sales")
    .select(
      "*, customer:customers(id, name, email, phone), agent:users!sales_agent_id_fkey(id, full_name), processor:users!sales_processor_id_fkey(id, full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.sale_type && filters.sale_type !== "all") {
    query = query.eq("sale_type", filters.sale_type);
  }
  if (filters?.agent_id && filters.agent_id !== "all") {
    query = query.eq("agent_id", filters.agent_id);
  }
  const searchTerm = filters?.search?.trim();
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    const { data: customerHits } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(500);

    const customerIds = customerHits?.map((r) => r.id) ?? [];
    const companyMatch = `company_name.ilike.${like}`;
    query =
      customerIds.length > 0
        ? query.or(
            `${companyMatch},customer_id.in.(${customerIds.join(",")})`,
          )
        : query.or(companyMatch);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getSale(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, customer:customers(*), agent:users!sales_agent_id_fkey(id, full_name, email), processor:users!sales_processor_id_fkey(id, full_name, email)"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export interface CreateSaleInput {
  sale_type: string;
  subtype: string;
  customer_id: string;
  agent_id?: string;
  agent_name?: string;
  company_name: string;
  utility_company_service_number: string;
  amount: number;
  discount: number;
  billed_month: string;
  next_billing_date: string;
  sales_notes: string;
  sale_date: string;
  customer_phone: string;
  customer_name: string;
  customer_email: string;
  service_address: string;
  account_holder_name: string;
  account_no?: string;
  dob: string;
  ssn: string;
  account_status: string;
  other_sale_data: string;
  policy_holder_name: string;
  vehicle_details: string;
  payment_method: string;
  merchant_name: string;
  // Card fields
  card_number: string;
  card_exp: string;
  card_cvv: string;
  card_billing_address: string;
  // Checking fields
  routing_number: string;
  bank_account_number: string;
  bank_account_holder_name: string;
  bank_name: string;
}

export interface UpdateSaleInput extends CreateSaleInput {
  id: string;
}

export async function createSale(formData: CreateSaleInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const chargedAmount = formData.amount - formData.discount;

  // If customer dropdown is removed, allow creating a new customer on-the-fly.
  let customerId = formData.customer_id;
  if (!customerId) {
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: formData.customer_name,
        phone: formData.customer_phone,
        email: formData.customer_email,
        address: formData.service_address,
        dob: formData.dob || null,
        ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
        account_no: formData.account_no || "",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (customerError) throw new Error(customerError.message);
    customerId = customerData.id as string;
  }

  const agentId =
    user.role === "super_admin" && formData.agent_id ? formData.agent_id : user.id;

  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert({
      status: "approved",
      sale_type: formData.sale_type,
      subtype: formData.subtype,
      customer_id: customerId,
      agent_id: agentId,
      agent_name: formData.agent_name || null,
      company_name: formData.company_name,
      utility_company_service_number: formData.utility_company_service_number?.trim() || "",
      amount: formData.amount,
      discount: formData.discount,
      charged_amount: chargedAmount,
      billed_month: formData.billed_month,
      next_billing_date: formData.next_billing_date || null,
      sales_notes: formData.sales_notes,
      sale_date: formData.sale_date || null,
      customer_phone: formData.customer_phone,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      service_address: formData.service_address,
      account_holder_name: formData.account_holder_name,
      dob: formData.dob,
      ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
      account_status: formData.account_status,
      other_sale_data: formData.other_sale_data,
      policy_holder_name: formData.policy_holder_name,
      vehicle_details: formData.vehicle_details,
      payment_method: formData.payment_method,
      merchant_name: formData.merchant_name,
    })
    .select("id")
    .single();

  if (saleError) throw new Error(saleError.message);

  if (formData.payment_method && saleData) {
    const paymentInsert: Record<string, unknown> = {
      sale_id: saleData.id,
      customer_id: customerId,
      method: formData.payment_method === "checking" ? "bank" : "card",
      amount: chargedAmount,
      merchant_name: formData.merchant_name,
    };

    if (formData.payment_method === "card" && formData.card_number) {
      paymentInsert.card_last_four = formData.card_number.slice(-4);
      paymentInsert.card_exp = formData.card_exp;
      paymentInsert.card_cvv_encrypted = formData.card_cvv
        ? encrypt(formData.card_cvv)
        : null;
      paymentInsert.billing_address = formData.card_billing_address;
      paymentInsert.encrypted_details = encrypt(
        JSON.stringify({ card_number: formData.card_number })
      );
    } else if (formData.payment_method === "checking") {
      paymentInsert.bank_name = formData.bank_name;
      paymentInsert.account_holder_name = formData.bank_account_holder_name;
      paymentInsert.routing_number_encrypted = formData.routing_number
        ? encrypt(formData.routing_number)
        : null;
      paymentInsert.account_number_encrypted = formData.bank_account_number
        ? encrypt(formData.bank_account_number)
        : null;
      paymentInsert.encrypted_details = encrypt(
        JSON.stringify({
          routing_number: formData.routing_number,
          account_number: formData.bank_account_number,
        })
      );
    }

    if (formData.payment_method === "card" || formData.payment_method === "checking") {
      await supabase.from("payments").insert(paymentInsert);
    }
  }

  revalidatePath("/dashboard/sales");
  return saleData?.id as string;
}

export async function updateSaleDetails(formData: UpdateSaleInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const chargedAmount = formData.amount - formData.discount;

  const { data: existingSale, error: existingError } = await supabase
    .from("sales")
    .select("agent_id")
    .eq("id", formData.id)
    .single();

  if (existingError || !existingSale) {
    throw new Error(existingError?.message || "Sale not found");
  }

  if (user.role === "sales_agent" && existingSale.agent_id !== user.id) {
    throw new Error("You can only edit your own sales.");
  }

  let agentId = existingSale.agent_id as string;
  if (user.role === "super_admin" && formData.agent_id) {
    agentId = formData.agent_id;
  } else if (user.role === "sales_agent") {
    agentId = user.id;
  }

  let agentName: string | null = formData.agent_name?.trim() || null;
  if (user.role === "super_admin" && agentId) {
    const { data: agentUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", agentId)
      .single();
    if (agentUser?.full_name) agentName = agentUser.full_name as string;
  }

  const updatePayload: Record<string, unknown> = {
    sale_type: formData.sale_type,
    subtype: formData.subtype,
    customer_id: formData.customer_id,
    agent_id: agentId,
    agent_name: agentName,
    company_name: formData.company_name,
    utility_company_service_number: formData.utility_company_service_number?.trim() || "",
    amount: formData.amount,
    discount: formData.discount,
    charged_amount: chargedAmount,
    billed_month: formData.billed_month,
    next_billing_date: formData.next_billing_date || null,
    sales_notes: formData.sales_notes,
    sale_date: formData.sale_date || null,
    customer_phone: formData.customer_phone,
    customer_name: formData.customer_name,
    customer_email: formData.customer_email,
    service_address: formData.service_address,
    account_holder_name: formData.account_holder_name,
    dob: formData.dob,
    account_status: formData.account_status,
    other_sale_data: formData.other_sale_data,
    policy_holder_name: formData.policy_holder_name,
    vehicle_details: formData.vehicle_details,
    payment_method: formData.payment_method,
    merchant_name: formData.merchant_name,
  };

  if (formData.ssn) {
    updatePayload.ssn_encrypted = encrypt(formData.ssn);
  }

  const { error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("id", formData.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/sales/${formData.id}`);
}

export async function updateSaleStatus(
  id: string,
  status: SaleStatus,
  processing_notes: string
) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sales")
    .update({
      status,
      processing_notes,
      processor_id: user.id,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/sales/${id}`);
  revalidatePath("/dashboard");
}

export async function bulkUpdateSaleStatus(
  ids: string[],
  status: SaleStatus,
  processing_notes: string
) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sales")
    .update({
      status,
      processing_notes,
      processor_id: user.id,
    })
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  if (user.role === "processor") {
    throw new Error("You do not have permission to delete sales.");
  }

  if (user.role === "sales_agent") {
    const { data: row, error: fetchErr } = await supabase
      .from("sales")
      .select("agent_id")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (row?.agent_id !== user.id) {
      throw new Error("You can only delete your own sales.");
    }
  }

  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}
