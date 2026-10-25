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

const SALE_LIST_SELECT =
  "id, sale_type, subtype, status, amount, discount, charged_amount, company_name, customer_name, customer_email, customer_phone, sale_date, created_at, agent_id, processor_id, account_holder_name, card_last_four, utility_company_service_number, policy_holder_name, customer:customers(id, name, email, phone, account_no), agent:users!sales_agent_id_fkey(id, full_name), processor:users!sales_processor_id_fkey(id, full_name)";

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
    const isNumericSearch =
      Number.isFinite(numericSearch) &&
      searchTerm.replace(/[^0-9.-]/g, "").length > 0;
    const textMatch = `customer_name.ilike.${like},customer_email.ilike.${like},customer_phone.ilike.${like},company_name.ilike.${like},utility_company_service_number.ilike.${like},policy_holder_name.ilike.${like},account_holder_name.ilike.${like},card_last_four.ilike.${like}`;
    const amountMatch = isNumericSearch
      ? `amount.eq.${numericSearch},charged_amount.eq.${numericSearch}`
      : "";
    const textOrAmount = amountMatch ? `${textMatch},${amountMatch}` : textMatch;
    next = next.or(textOrAmount);
  }

  return next;
}

function emptyStats(): SalesStats {
  return {
    totalRecords: 0,
    totalAmount: 0,
    grossChargedAmount: 0,
    chargebackImpactedAmount: 0,
    totalChargedAmount: 0,
    avgChargedAmount: 0,
    utilityCount: 0,
    insuranceCount: 0,
  };
}

async function fetchSalesStatsRpc(
  supabase: ReturnType<typeof createClient>,
  filters?: {
    sale_type?: string;
    agent_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  },
): Promise<SalesStats | null> {
  const agentId =
    filters?.agent_id && filters.agent_id !== "all" ? filters.agent_id : null;
  const saleType =
    filters?.sale_type && filters.sale_type !== "all" ? filters.sale_type : null;

  // RPC added in migration 058; cast until generated types are refreshed in all envs.
  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("get_filtered_sales_stats", {
    p_sale_type: saleType,
    p_agent_id: agentId,
    p_from_date: filters?.from_date
      ? `${filters.from_date}T00:00:00.000Z`
      : null,
    p_to_date: filters?.to_date ? `${filters.to_date}T23:59:59.999Z` : null,
    p_search: filters?.search?.trim() || null,
  });

  if (error || !data) return null;

  const row = data as {
    total_records?: number;
    total_amount?: number;
    gross_charged_amount?: number;
    chargeback_impacted_amount?: number;
    utility_count?: number;
    insurance_count?: number;
  };

  const totalRecords = Number(row.total_records || 0);
  const grossChargedAmount = Number(row.gross_charged_amount || 0);
  const chargebackImpactedAmount = Number(row.chargeback_impacted_amount || 0);
  const netTotalChargedAmount = grossChargedAmount - chargebackImpactedAmount;

  return {
    totalRecords,
    totalAmount: Number(row.total_amount || 0),
    grossChargedAmount,
    chargebackImpactedAmount,
    totalChargedAmount: netTotalChargedAmount,
    avgChargedAmount:
      totalRecords > 0 ? netTotalChargedAmount / totalRecords : 0,
    utilityCount: Number(row.utility_count || 0),
    insuranceCount: Number(row.insurance_count || 0),
  };
}

/** Fallback if RPC is not deployed yet — capped to avoid downloading entire table. */
async function fetchSalesStatsFallback(
  supabase: ReturnType<typeof createClient>,
  filters?: {
    status?: string;
    sale_type?: string;
    agent_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  },
): Promise<SalesStats> {
  const statsQuery = applySalesFilters(
    supabase
      .from("sales")
      .select("id, sale_type, amount, charged_amount, chargebacks(sale_id)")
      .limit(2000),
    filters,
  );

  const { data: statsRows, error: statsError } = await statsQuery;
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
    {
      totalAmount: 0,
      totalChargedAmount: 0,
      utilityCount: 0,
      insuranceCount: 0,
    },
  );

  const netTotalChargedAmount =
    totals.totalChargedAmount - chargebackImpactedAmount;
  const totalRecords = rows.length;

  return {
    totalRecords,
    totalAmount: totals.totalAmount,
    grossChargedAmount: totals.totalChargedAmount,
    chargebackImpactedAmount,
    totalChargedAmount: netTotalChargedAmount,
    avgChargedAmount:
      totalRecords > 0 ? netTotalChargedAmount / totalRecords : 0,
    utilityCount: totals.utilityCount,
    insuranceCount: totals.insuranceCount,
  };
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
    .select(SALE_LIST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  query = applySalesFilters(query, filters);

  const [{ data, error, count }, rpcStats] = await Promise.all([
    query.range(offset, offset + pageSize - 1),
    fetchSalesStatsRpc(supabase, filters),
  ]);

  if (error) throw new Error(error.message);

  const stats =
    rpcStats ?? (await fetchSalesStatsFallback(supabase, filters)) ?? emptyStats();

  return {
    data: (data || []) as unknown as Sale[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    stats,
  };
}
