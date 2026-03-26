"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { SaleAttachment } from "@/lib/types";

export async function getSaleAttachments(saleId: string): Promise<SaleAttachment[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sale_attachments")
    .select("*")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as SaleAttachment[];
}

export async function createSaleAttachment(input: {
  sale_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sale_attachments")
    .insert({
      sale_id: input.sale_id,
      file_name: input.file_name,
      file_path: input.file_path,
      file_url: input.file_url,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/sales/${input.sale_id}`);
  revalidatePath(`/dashboard/sales/${input.sale_id}/edit`);
  revalidatePath("/dashboard/sales");

  return data as SaleAttachment;
}

export async function deleteSaleAttachment(id: string, saleId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("sale_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath(`/dashboard/sales/${saleId}/edit`);
  revalidatePath("/dashboard/sales");
}

