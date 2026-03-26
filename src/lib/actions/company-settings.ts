"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type CompanySettings = {
  company_name: string;
  address_line: string;
  contact_email: string;
  logo_url: string | null;
};

export async function getCompanySettings(): Promise<CompanySettings> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("company_name, address_line, contact_email, logo_url")
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return {
    company_name: data.company_name,
    address_line: data.address_line,
    contact_email: data.contact_email,
    logo_url: data.logo_url ?? null,
  };
}

export async function updateCompanySettings(input: CompanySettings) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_settings")
    .update({
      company_name: input.company_name,
      address_line: input.address_line,
      contact_email: input.contact_email,
      logo_url: input.logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

