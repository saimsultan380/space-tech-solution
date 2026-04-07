"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ChargebackStatus } from "@/lib/types";
import { createNotification } from "@/lib/actions/notifications";

export interface ChargebackStats {
  total: number;
  open: number;
  resolved: number;
  disputed: number;
  assigned: number;
  impactedAmount: number;
}

interface ChargebackFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ChargebackStatus | "all";
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
}

interface ChargebackSearchContext {
  search: string;
  saleIds: string[];
  assigneeIds: string[];
}

function applyChargebackFilters(query: any, filters?: ChargebackFilters, searchContext?: ChargebackSearchContext) {
  let scopedQuery = query;

  if (searchContext) {
    const orParts = [`reason.ilike.%${searchContext.search}%`, `status.ilike.%${searchContext.search}%`];

    if (searchContext.saleIds.length > 0) {
      orParts.push(`sale_id.in.(${searchContext.saleIds.join(",")})`);
    }

    if (searchContext.assigneeIds.length > 0) {
      orParts.push(`assigned_to.in.(${searchContext.assigneeIds.join(",")})`);
    }

    scopedQuery = scopedQuery.or(orParts.join(","));
  }

  if (filters?.status && filters.status !== "all") {
    scopedQuery = scopedQuery.eq("status", filters.status);
  }

  if (filters?.assigned_to && filters.assigned_to !== "all") {
    scopedQuery = scopedQuery.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.from_date) {
    scopedQuery = scopedQuery.gte("date", filters.from_date);
  }

  if (filters?.to_date) {
    scopedQuery = scopedQuery.lte("date", filters.to_date);
  }

  return scopedQuery;
}

export async function getChargebacks(filters?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ChargebackStatus | "all";
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;
  const search = filters?.q?.trim() || "";

  let searchContext: ChargebackSearchContext | undefined;
  if (search) {
    const escaped = search.replace(/,/g, "");
    const numericSearch = Number(escaped);
    const isNumericSearch = Number.isFinite(numericSearch);
    const amountOr = isNumericSearch ? `,charged_amount.eq.${numericSearch}` : "";

    const [salesResult, assigneesResult] = await Promise.all([
      supabase
        .from("sales")
        .select("id")
        .or(
          `company_name.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,sale_type.ilike.%${search}%,subtype.ilike.%${search}%${amountOr}`,
        )
        .limit(500),
      supabase.from("users").select("id").ilike("full_name", `%${search}%`).limit(500),
    ]);

    const saleIds = (salesResult.data || []).map((row) => row.id);
    const assigneeIds = (assigneesResult.data || []).map((row) => row.id);

    searchContext = {
      search,
      saleIds,
      assigneeIds,
    };
  }

  const baseQuery = applyChargebackFilters(
    supabase
    .from("chargebacks")
    .select(
      "*, sale:sales(id, company_name, customer_name, customer_email, sale_type, subtype, charged_amount, created_at, agent_id, agent:users!sales_agent_id_fkey(full_name)), assignee:users!chargebacks_assigned_to_fkey(id, full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false }),
    filters,
    searchContext,
  );

  const statsQuery = applyChargebackFilters(
    supabase
    .from("chargebacks")
    .select(
      "status, assigned_to, sale:sales(charged_amount, company_name, customer_name, customer_email, sale_type, subtype), assignee:users!chargebacks_assigned_to_fkey(full_name)",
    ),
    filters,
    searchContext,
  );

  const [{ data, error, count }, { data: statsRows, error: statsError }] = await Promise.all([
    baseQuery.range(offset, offset + pageSize - 1),
    statsQuery,
  ]);

  if (error) throw new Error(error.message);
  if (statsError) throw new Error(statsError.message);

  const rows = (statsRows || []) as Array<{
    status: ChargebackStatus | null;
    assigned_to: string | null;
    sale: { charged_amount?: number | null } | null;
  }>;
  const stats: ChargebackStats = {
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    disputed: rows.filter((r) => r.status === "disputed").length,
    assigned: rows.filter((r) => !!r.assigned_to).length,
    impactedAmount: rows.reduce((sum, r) => sum + Number(r.sale?.charged_amount || 0), 0),
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
