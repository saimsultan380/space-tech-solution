"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import type { SaleStatus } from "@/lib/types";

function isMissingSourceColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("source") && (message.includes("column") || message.includes("schema cache"));
}

function isSubtypeConstraintError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("subtype") && (message.includes("invalid") || message.includes("constraint"));
}

export interface SalesStats {
  totalRecords: number;
  totalAmount: number;
  totalChargedAmount: number;
  avgChargedAmount: number;
  utilityCount: number;
  insuranceCount: number;
}

function applySalesFilters(
  query: any,
  filters?: {
    status?: string;
    sale_type?: string;
    agent_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  },
) {
  let next = query;

  if (filters?.status && filters.status !== "all") {
    next = next.eq("status", filters.status);
  }
  if (filters?.sale_type && filters.sale_type !== "all") {
    next = next.eq("sale_type", filters.sale_type);
  }
  if (filters?.agent_id && filters.agent_id !== "all") {
    next = next.eq("agent_id", filters.agent_id);
  }
  if (filters?.from_date) {
    next = next.gte("created_at", `${filters.from_date}T00:00:00.000Z`);
  }
  if (filters?.to_date) {
    next = next.lte("created_at", `${filters.to_date}T23:59:59.999Z`);
  }

  const searchTerm = filters?.search?.trim();
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    const numericSearch = Number(searchTerm.replace(/,/g, ""));
    const isNumericSearch = Number.isFinite(numericSearch);
    const textMatch = `customer_name.ilike.${like},customer_email.ilike.${like},customer_phone.ilike.${like},company_name.ilike.${like}`;
    const amountMatch = isNumericSearch
      ? `amount.eq.${numericSearch},charged_amount.eq.${numericSearch}`
      : "";
    const textOrAmount = amountMatch ? `${textMatch},${amountMatch}` : textMatch;
    next = next.or(textOrAmount);
  }

  return next;
}

export async function getSales(filters?: {
  status?: string;
  sale_type?: string;
  agent_id?: string;
  from_date?: string;
  to_date?: string;
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

  query = applySalesFilters(query, filters);

  const statsQuery = applySalesFilters(
    supabase.from("sales").select("sale_type, amount, charged_amount"),
    filters,
  );

  const [{ data, error, count }, { data: statsRows, error: statsError }] = await Promise.all([
    query.range(offset, offset + pageSize - 1),
    statsQuery,
  ]);

  if (error) throw new Error(error.message);
  if (statsError) throw new Error(statsError.message);

  const rows = (statsRows || []) as Array<{ sale_type: string | null; amount: number | null; charged_amount: number | null }>;
  const totals = rows.reduce(
    (acc, row) => {
      const amount = Number(row.amount || 0);
      const charged = Number(row.charged_amount || 0);
      acc.totalAmount += amount;
      acc.totalChargedAmount += charged;
      if (row.sale_type === "utility") acc.utilityCount += 1;
      if (row.sale_type === "insurance") acc.insuranceCount += 1;
      return acc;
    },
    { totalAmount: 0, totalChargedAmount: 0, utilityCount: 0, insuranceCount: 0 },
  );
  const totalRecords = rows.length;
  const stats: SalesStats = {
    totalRecords,
    totalAmount: totals.totalAmount,
    totalChargedAmount: totals.totalChargedAmount,
    avgChargedAmount: totalRecords > 0 ? totals.totalChargedAmount / totalRecords : 0,
    utilityCount: totals.utilityCount,
    insuranceCount: totals.insuranceCount,
  };

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    stats,
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
  const user = await requireRole(["super_admin", "sales_agent", "processor"]);
  const supabase = await createClient();

  const chargedAmount = formData.amount - formData.discount;

  // If customer dropdown is removed, resolve an existing customer first to avoid duplicates
  // between Sales and Call Logs Responses datasets.
  let customerId = formData.customer_id;
  if (!customerId) {
    const email = formData.customer_email?.trim();
    const phone = formData.customer_phone?.trim();
    let existingCustomerId: string | null = null;

    if (email) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      existingCustomerId = (byEmail?.id as string | undefined) || null;
    }
    if (!existingCustomerId && phone) {
      const { data: byPhone } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      existingCustomerId = (byPhone?.id as string | undefined) || null;
    }

    if (existingCustomerId) {
      customerId = existingCustomerId;
    } else {
      const baseCustomerPayload: Record<string, unknown> = {
        name: formData.customer_name,
        phone: formData.customer_phone,
        email: formData.customer_email,
        address: formData.service_address,
        dob: formData.dob || null,
        ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
        account_no: formData.account_no || "",
        created_by: user.id,
      };
      const withSourceCustomerPayload = { ...baseCustomerPayload, source: "sales" };

      let { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert(withSourceCustomerPayload)
        .select("id")
        .single();

      if (isMissingSourceColumnError(customerError)) {
        const retryResult = await supabase
          .from("customers")
          .insert(baseCustomerPayload)
          .select("id")
          .single();
        customerData = retryResult.data;
        customerError = retryResult.error;
      }

      if (customerError) throw new Error(customerError.message);
      if (!customerData?.id) throw new Error("Failed to create customer for sale");
      customerId = customerData.id as string;
    }
  }

  const agentId =
    user.role === "super_admin" && formData.agent_id ? formData.agent_id : user.id;

  const saleInsertPayload: Record<string, unknown> = {
    status: "approved",
    sale_type: formData.sale_type,
    subtype: formData.subtype,
    customer_id: customerId,
    agent_id: agentId,
    processor_id: user.role === "processor" ? user.id : null,
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
  };

  let { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert(saleInsertPayload)
    .select("id")
    .single();

  if (
    saleError &&
    formData.subtype === "cancellation" &&
    isSubtypeConstraintError(saleError)
  ) {
    const retryResult = await supabase
      .from("sales")
      .insert({ ...saleInsertPayload, subtype: "cancelation" })
      .select("id")
      .single();
    saleData = retryResult.data;
    saleError = retryResult.error;
  }

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
  const user = await requireRole(["super_admin", "sales_agent"]);
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

  let { error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("id", formData.id);

  if (
    error &&
    formData.subtype === "cancellation" &&
    isSubtypeConstraintError(error)
  ) {
    const retryResult = await supabase
      .from("sales")
      .update({ ...updatePayload, subtype: "cancelation" })
      .eq("id", formData.id);
    error = retryResult.error;
  }

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
