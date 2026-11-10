"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CallSetupCharge = {
  id: string;
  starts_on: string;
  ends_on: string;
  amount: number;
};

function mapRow(row: {
  id: string;
  starts_on: string;
  ends_on: string;
  amount: number | string;
}): CallSetupCharge {
  return {
    id: row.id,
    starts_on: String(row.starts_on).slice(0, 10),
    ends_on: String(row.ends_on).slice(0, 10),
    amount: Number(row.amount),
  };
}

function assertCharge(startsOn: string, endsOn: string, amount: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
    throw new Error("Enter a from date and a to date.");
  }
  if (endsOn < startsOn) {
    throw new Error("The to date must be on or after the from date.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a charge greater than zero.");
  }
}

function friendlyError(message: string) {
  if (message.toLowerCase().includes("overlap")) {
    return "Those dates overlap a charge that is already saved.";
  }
  return message;
}

function refresh() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/reports");
}

export async function listCallSetupCharges(): Promise<CallSetupCharge[]> {
  await requireRole(["super_admin"]);
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("call_setup_charges")
    .select("id, starts_on, ends_on, amount")
    .order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

export async function createCallSetupCharge(input: {
  starts_on: string;
  ends_on: string;
  amount: number;
}): Promise<CallSetupCharge[]> {
  await requireRole(["super_admin"]);
  assertCharge(input.starts_on, input.ends_on, input.amount);
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("call_setup_charges").insert({
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    amount: input.amount,
  });
  if (error) throw new Error(friendlyError(error.message));
  refresh();
  return listCallSetupCharges();
}

export async function updateCallSetupCharge(input: {
  id: string;
  starts_on: string;
  ends_on: string;
  amount: number;
}): Promise<CallSetupCharge[]> {
  await requireRole(["super_admin"]);
  if (!input.id) throw new Error("Missing charge.");
  assertCharge(input.starts_on, input.ends_on, input.amount);
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("call_setup_charges")
    .update({
      starts_on: input.starts_on,
      ends_on: input.ends_on,
      amount: input.amount,
    })
    .eq("id", input.id);
  if (error) throw new Error(friendlyError(error.message));
  refresh();
  return listCallSetupCharges();
}

export async function deleteCallSetupCharge(id: string): Promise<CallSetupCharge[]> {
  await requireRole(["super_admin"]);
  if (!id) throw new Error("Missing charge.");
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("call_setup_charges").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  return listCallSetupCharges();
}
