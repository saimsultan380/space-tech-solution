import { createClient } from "@/lib/supabase/client";
import { sanitizeFilterValue } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export interface SalesStats {
  totalRecords: number;
  totalAmount: number;
  grossChargedAmount: number;
  chargebackImpactedAmount: number;
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
  let next = query.is("deleted_at", null);

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
    const safe = sanitizeFilterValue(searchTerm);
    const like = `%${safe}%`;
    const numericSearch = Number(searchTerm.replace(/[^0-9.-]/g, ""));
    const isNumericSearch = Number.isFinite(numericSearch) && searchTerm.replace(/[^0-9.-]/g, "").length > 0;
    const textMatch = `customer_name.ilike.${like},customer_email.ilike.${like},customer_phone.ilike.${like},company_name.ilike.${like},utility_company_service_number.ilike.${like},policy_holder_name.ilike.${like},account_holder_name.ilike.${like},card_last_four.ilike.${like}`;
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
}): Promise<{
  data: Sale[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: SalesStats;
}> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("sales")
    .select(
      "*, customer:customers(id, name, email, phone, account_no), agent:users!sales_agent_id_fkey(id, full_name), processor:users!sales_processor_id_fkey(id, full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  query = applySalesFilters(query, filters);

  // Embed chargebacks as a nested select — single query, no separate round-trip
  // and no URL-length issues from a large `.in()` list.
  const statsQuery = applySalesFilters(
    supabase
      .from("sales")
      .select("id, sale_type, amount, charged_amount, chargebacks(sale_id)"),
    filters,
  );

  // ── Run page + stats queries in parallel ─────────────────────────────────
  const [
    { data, error, count },
    { data: statsRows, error: statsError },
  ] = await Promise.all([
    query.range(offset, offset + pageSize - 1),
    statsQuery,
  ]);

  if (error) throw new Error(error.message);
  if (statsError) throw new Error(statsError.message);

  const rows = (statsRows || []) as Array<{
    id: string;
    sale_type: string | null;
    amount: number | null;
    charged_amount: number | null;
    chargebacks: Array<{ sale_id: string }> | null;
  }>;

  let chargebackImpactedAmount = 0;
  const totals = rows.reduce(
    (acc, row) => {
      const amount = Number(row.amount || 0);
      const charged = Number(row.charged_amount || 0);
      acc.totalAmount += amount;
      acc.totalChargedAmount += charged;
      if (row.sale_type === "utility") acc.utilityCount += 1;
      if (row.sale_type === "insurance") acc.insuranceCount += 1;
      if (row.chargebacks && row.chargebacks.length > 0) {
        chargebackImpactedAmount += charged;
      }
      return acc;
    },
    { totalAmount: 0, totalChargedAmount: 0, utilityCount: 0, insuranceCount: 0 },
  );

  const netTotalChargedAmount = totals.totalChargedAmount - chargebackImpactedAmount;
  const totalRecords = rows.length;
  const stats: SalesStats = {
    totalRecords,
    totalAmount: totals.totalAmount,
    grossChargedAmount: totals.totalChargedAmount,
    chargebackImpactedAmount,
    totalChargedAmount: netTotalChargedAmount,
    avgChargedAmount: totalRecords > 0 ? netTotalChargedAmount / totalRecords : 0,
    utilityCount: totals.utilityCount,
    insuranceCount: totals.insuranceCount,
  };

  return {
    data: (data || []) as unknown as Sale[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    stats,
  };
}
