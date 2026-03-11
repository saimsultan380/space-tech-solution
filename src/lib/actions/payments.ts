"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function getPayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, sale:sales(id, company_name, status), customer:customers(id, name)")
    .order("created_at", { ascending: false });

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
