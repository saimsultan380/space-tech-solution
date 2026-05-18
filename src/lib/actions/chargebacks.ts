"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ChargebackPriority, ChargebackStatus } from "@/lib/types";
import { createNotification } from "@/lib/actions/notifications";
import { sanitizeFilterValue } from "@/lib/utils";

export interface ChargebackStats {
  total: number;
  open: number;
  resolved: number;
  disputed: number;
  assigned: number;
  impactedAmount: number;
  avgResolutionDays: number;
  resolutionRate: number;
  disputeSuccessRate: number;
  byMonth: Array<{ month: string; count: number }>;
  topReasons: Array<{ reason: string; count: number }>;
}

const EMPTY_CHARGEBACK_STATS: ChargebackStats = {
  total: 0,
  open: 0,
  resolved: 0,
  disputed: 0,
  assigned: 0,
  impactedAmount: 0,
  avgResolutionDays: 0,
  resolutionRate: 0,
  disputeSuccessRate: 0,
  byMonth: [],
  topReasons: [],
};

interface ChargebackFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ChargebackStatus | "all" | string;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

async function recordChargebackActivity(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  chargebackId: string;
  actorId?: string | null;
  eventType: string;
  details: string;
}) {
  await params.supabase.from("chargeback_activity").insert({
    chargeback_id: params.chargebackId,
    actor_id: params.actorId ?? null,
    event_type: params.eventType,
    details: params.details,
  });
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
    const selectedStatuses = filters.status
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);
    if (selectedStatuses.length > 1) {
      scopedQuery = scopedQuery.in("status", selectedStatuses);
    } else if (selectedStatuses.length === 1) {
      scopedQuery = scopedQuery.eq("status", selectedStatuses[0]);
    }
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
  status?: ChargebackStatus | "all" | string;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;
  const search = filters?.q?.trim() || "";
  const hasMinAmount = typeof filters?.min_amount === "number" && Number.isFinite(filters.min_amount);
  const hasMaxAmount = typeof filters?.max_amount === "number" && Number.isFinite(filters.max_amount);

  let amountFilteredSaleIds: string[] | null = null;
  if (hasMinAmount || hasMaxAmount) {
    let amountQuery = supabase.from("sales").select("id");
    if (hasMinAmount) {
      amountQuery = amountQuery.gte("charged_amount", Number(filters?.min_amount));
    }
    if (hasMaxAmount) {
      amountQuery = amountQuery.lte("charged_amount", Number(filters?.max_amount));
    }
    const { data: amountFilteredSales, error: amountError } = await amountQuery.limit(5000);
    if (amountError) throw new Error(amountError.message);
    amountFilteredSaleIds = (amountFilteredSales || []).map((row) => row.id);
  }

  let searchContext: ChargebackSearchContext | undefined;
  if (search) {
    const safe = sanitizeFilterValue(search);
    const numericSearch = Number(search.replace(/[^0-9.-]/g, ""));
    const isNumericSearch = Number.isFinite(numericSearch) && search.replace(/[^0-9.-]/g, "").length > 0;
    const amountOr = isNumericSearch ? `,charged_amount.eq.${numericSearch}` : "";

    const { data: peopleMatch, error: peopleError } = await supabase
      .from("users")
      .select("id")
      .ilike("full_name", `%${safe}%`)
      .limit(50);
    if (peopleError) throw new Error(peopleError.message);
    const personIds = (peopleMatch || []).map((row) => row.id);
    const agentMatchOr = personIds.length > 0 ? `,agent_id.in.(${personIds.join(",")})` : "";

    const [salesResult, assigneesResult] = await Promise.all([
      supabase
        .from("sales")
        .select("id")
        .or(
          `company_name.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,sale_type.ilike.%${safe}%,subtype.ilike.%${safe}%${amountOr}${agentMatchOr}`,
        )
        .limit(100),
      Promise.resolve({ data: peopleMatch || [] }),
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
      "status, assigned_to, reason, created_at, updated_at, sale:sales(charged_amount, company_name, customer_name, customer_email, sale_type, subtype), assignee:users!chargebacks_assigned_to_fkey(full_name)",
    ),
    filters,
    searchContext,
  );

  if (amountFilteredSaleIds) {
    if (amountFilteredSaleIds.length === 0) {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
        stats: EMPTY_CHARGEBACK_STATS,
      };
    }
    baseQuery.in("sale_id", amountFilteredSaleIds);
    statsQuery.in("sale_id", amountFilteredSaleIds);
  }

  const [{ data, error, count }, { data: statsRows, error: statsError }] = await Promise.all([
    baseQuery.range(offset, offset + pageSize - 1),
    statsQuery,
  ]);

  if (error) throw new Error(error.message);
  if (statsError) throw new Error(statsError.message);

  const rows = (statsRows || []) as Array<{
    status: ChargebackStatus | null;
    assigned_to: string | null;
    reason: string | null;
    created_at: string | null;
    updated_at: string | null;
    sale: { charged_amount?: number | null } | null;
  }>;
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }).map((_, index) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`,
      month: dt.toLocaleString("en-US", { month: "short" }),
      count: 0,
    };
  });
  const monthMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  const reasonCounts = new Map<string, number>();

  let resolvedDurationTotalDays = 0;
  let resolvedDurationCount = 0;

  for (const row of rows) {
    if (row.created_at) {
      const created = new Date(row.created_at);
      const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const monthBucket = monthMap.get(monthKey);
      if (monthBucket) {
        monthBucket.count += 1;
      }
    }

    const normalizedReason = (row.reason || "").trim();
    if (normalizedReason) {
      reasonCounts.set(normalizedReason, (reasonCounts.get(normalizedReason) || 0) + 1);
    }

    if (row.status === "resolved" && row.created_at && row.updated_at) {
      const createdTs = new Date(row.created_at).getTime();
      const updatedTs = new Date(row.updated_at).getTime();
      if (Number.isFinite(createdTs) && Number.isFinite(updatedTs) && updatedTs >= createdTs) {
        resolvedDurationTotalDays += (updatedTs - createdTs) / (1000 * 60 * 60 * 24);
        resolvedDurationCount += 1;
      }
    }
  }

  const resolvedCount = rows.filter((r) => r.status === "resolved").length;
  const disputedCount = rows.filter((r) => r.status === "disputed").length;
  const totalRows = rows.length;
  const resolvedOrDisputed = resolvedCount + disputedCount;

  const stats: ChargebackStats = {
    total: totalRows,
    open: rows.filter((r) => r.status === "open").length,
    resolved: resolvedCount,
    disputed: disputedCount,
    assigned: rows.filter((r) => !!r.assigned_to).length,
    impactedAmount: rows.reduce((sum, r) => sum + Number(r.sale?.charged_amount || 0), 0),
    avgResolutionDays: resolvedDurationCount > 0 ? roundTwo(resolvedDurationTotalDays / resolvedDurationCount) : 0,
    resolutionRate: totalRows > 0 ? roundTwo((resolvedCount / totalRows) * 100) : 0,
    disputeSuccessRate: resolvedOrDisputed > 0 ? roundTwo((resolvedCount / resolvedOrDisputed) * 100) : 0,
    byMonth: monthBuckets.map((bucket) => ({ month: bucket.month, count: bucket.count })),
    topReasons: Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count })),
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
  priority?: ChargebackPriority;
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

  const { data: inserted, error } = await supabase.from("chargebacks").insert({
    sale_id: formData.sale_id,
    date: formData.date,
    reason: formData.reason,
    assigned_to: formData.assigned_to.trim(),
    priority: formData.priority || "medium",
  }).select("id").single();

  if (error) throw new Error(error.message);

  if (inserted?.id) {
    await recordChargebackActivity({
      supabase,
      chargebackId: inserted.id,
      actorId: user.id,
      eventType: "created",
      details: `Chargeback created and assigned to ${(formData.assigned_to || "").trim()}.`,
    });
  }

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
  const actor = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("chargebacks")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await recordChargebackActivity({
    supabase,
    chargebackId: id,
    actorId: actor.id,
    eventType: "status_changed",
    details: `Status changed to ${status}.`,
  });
  revalidatePath("/dashboard/chargebacks");
}

export async function updateChargebackPriority(id: string, priority: ChargebackPriority) {
  const actor = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("chargebacks")
    .update({ priority })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await recordChargebackActivity({
    supabase,
    chargebackId: id,
    actorId: actor.id,
    eventType: "priority_changed",
    details: `Priority changed to ${priority}.`,
  });

  revalidatePath("/dashboard/chargebacks");
}

export async function addChargebackNote(chargebackId: string, content: string) {
  const actor = await requireAuth();
  const supabase = await createClient();
  const text = content.trim();
  if (!text) throw new Error("Note cannot be empty.");

  const { error } = await supabase.from("chargeback_notes").insert({
    chargeback_id: chargebackId,
    user_id: actor.id,
    content: text,
  });
  if (error) throw new Error(error.message);

  await recordChargebackActivity({
    supabase,
    chargebackId,
    actorId: actor.id,
    eventType: "note_added",
    details: text.length > 80 ? `${text.slice(0, 80)}...` : text,
  });

  revalidatePath("/dashboard/chargebacks");
}

export async function getChargebackCaseDetails(chargebackId: string) {
  await requireAuth();
  const supabase = await createClient();

  const [{ data: notes, error: notesError }, { data: activity, error: activityError }] = await Promise.all([
    supabase
      .from("chargeback_notes")
      .select("id, content, created_at, user:user_id(id, full_name)")
      .eq("chargeback_id", chargebackId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chargeback_activity")
      .select("id, event_type, details, created_at, actor:actor_id(id, full_name)")
      .eq("chargeback_id", chargebackId)
      .order("created_at", { ascending: false }),
  ]);

  if (notesError) throw new Error(notesError.message);
  if (activityError) throw new Error(activityError.message);

  return {
    notes: notes || [],
    activity: activity || [],
  };
}

export async function deleteChargeback(id: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { error } = await supabase.from("chargebacks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/chargebacks");
}
