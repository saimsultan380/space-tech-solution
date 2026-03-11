"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, created_by_user:users!customers_created_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createCustomer(formData: {
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  ssn: string;
  cnic: string;
  account_no: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("customers").insert({
    name: formData.name,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    dob: formData.dob || null,
    ssn_encrypted: formData.ssn ? encrypt(formData.ssn) : "",
    cnic: formData.cnic || "",
    account_no: formData.account_no || "",
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/customers");
}

export async function updateCustomer(
  id: string,
  formData: {
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    ssn?: string;
    cnic?: string;
    account_no?: string;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    dob: formData.dob || null,
    cnic: formData.cnic || "",
    account_no: formData.account_no || "",
  };

  if (formData.ssn) {
    updateData.ssn_encrypted = encrypt(formData.ssn);
  }

  const { error } = await supabase
    .from("customers")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/customers");
}

export async function deleteCustomer(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/customers");
}

export async function searchCustomers(query: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}
