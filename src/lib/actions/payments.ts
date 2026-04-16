"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function getPayments(filters?: {
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("payments")
    .select("*, sale:sales(id, company_name, status), customer:customers(id, name)", { count: "exact" })
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

export async function getPaymentsBySaleId(saleId: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, method, amount, card_last_four, card_exp, billing_address, merchant_name, bank_name, account_holder_name, created_at, encrypted_details, card_cvv_encrypted, routing_number_encrypted, account_number_encrypted",
    )
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Latest payment row for a sale (for edit form prefill). */
export async function getLatestPaymentRowForSale(saleId: string) {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createPayment(formData: {
  sale_id: string;
  customer_id: string;
  method: string;
  amount: number;
  card_number?: string;
  bank_name?: string;
  bank_account?: string;
}) {
  await requireAuth();
  const supabase = await createClient();

  let cardLastFour: string | null = null;
  let encryptedDetails = "";

  if (formData.method === "card" && formData.card_number) {
    cardLastFour = formData.card_number.slice(-4);
    encryptedDetails = encrypt(
      JSON.stringify({ card_number: formData.card_number })
    );
  } else if (formData.method === "bank") {
    encryptedDetails = encrypt(
      JSON.stringify({
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
      })
    );
  }

  const { error } = await supabase.from("payments").insert({
    sale_id: formData.sale_id,
    customer_id: formData.customer_id,
    method: formData.method,
    amount: formData.amount,
    card_last_four: cardLastFour,
    bank_name: formData.bank_name || null,
    encrypted_details: encryptedDetails,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/payments");
}
