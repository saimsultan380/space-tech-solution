import { createClient } from "@/lib/supabase/client";
import { decrypt } from "@/lib/encryption";
import type {
  ProcessingAccountStatus,
  ProcessingAccountType,
} from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseFilterBuilder = any;

interface RawProcessingAccountRow {
  id: string;
  status: ProcessingAccountStatus | null;
  account_holder_name: string | null;
  billing_address: string | null;
  notes: string | null;
  expiration_date: string | null;
  account_type: ProcessingAccountType | null;
  routing_number_encrypted: string | null;
  account_number_encrypted: string | null;
  card_number_encrypted: string | null;
  cvv_encrypted: string | null;
  created_at: string;
  updated_at: string | null;
  [key: string]: unknown;
}

interface NormalisedProcessingAccountRow {
  id: string;
  status: ProcessingAccountStatus | null;
  account_holder_name: string | null;
  billing_address: string | null;
  notes: string | null;
  expiration_date: string;
  account_type: ProcessingAccountType;
  routing_number: string;
  account_number: string;
  card_number: string;
  cvv: string;
  created_at: string;
  updated_at: string | null;
  [key: string]: unknown;
}

function safeDecrypt(ciphertext: string | null | undefined): string {
  if (!ciphertext?.trim()) return "";
  try {
    return decrypt(ciphertext) || "";
  } catch {
    return "";
  }
}

export interface ProcessingAccountStats {
  total: number;
  active: number;
  not_working: number;
  closed: number;
  reversal_issue: number;
  under_review: number;
}

export async function getProcessingAccountStats(filters?: {
  search?: string;
  from_date?: string;
  to_date?: string;
  account_type?: string;
}): Promise<ProcessingAccountStats> {
  const supabase = createClient();

  const statuses = [
    "active",
    "not_working",
    "closed",
    "reversal_issue",
    "under_review",
  ] as const;

  const applyStructuralFilters = (
    query: SupabaseFilterBuilder,
  ): SupabaseFilterBuilder => {
    let next = query;
    if (filters?.account_type && filters.account_type !== "all") {
      next = next.eq("account_type", filters.account_type);
    }
    if (filters?.from_date) {
      next = next.gte("created_at", `${filters.from_date}T00:00:00.000Z`);
    }
    if (filters?.to_date) {
      next = next.lte("created_at", `${filters.to_date}T23:59:59.999Z`);
    }
    return next;
  };

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase().trim();
    // Encrypted fields can only be searched by decrypting each row in JS.
    // Cap at 300 so we don't decrypt thousands of rows on every keystroke.
    let q = supabase
      .from("processing_accounts")
      .select(
        "id, status, account_holder_name, billing_address, notes, expiration_date, account_type, routing_number_encrypted, account_number_encrypted, card_number_encrypted, cvv_encrypted",
      )
      .limit(300);
    q = applyStructuralFilters(q);
    const { data } = await q;

    const filtered = (
      (data as unknown as RawProcessingAccountRow[]) || []
    ).filter((a) => {
      const routing = safeDecrypt(a.routing_number_encrypted);
      const accountNo = safeDecrypt(a.account_number_encrypted);
      const cardNo = safeDecrypt(a.card_number_encrypted);
      const cvv = safeDecrypt(a.cvv_encrypted);
      return (
        (a.account_holder_name || "").toLowerCase().includes(searchLower) ||
        (a.billing_address || "").toLowerCase().includes(searchLower) ||
        (a.notes || "").toLowerCase().includes(searchLower) ||
        (a.expiration_date || "").toLowerCase().includes(searchLower) ||
        routing.toLowerCase().includes(searchLower) ||
        accountNo.toLowerCase().includes(searchLower) ||
        cardNo.toLowerCase().includes(searchLower) ||
        cvv.toLowerCase().includes(searchLower)
      );
    });

    const countByStatus = (s: string) =>
      filtered.filter((a: RawProcessingAccountRow) => a.status === s).length;
    return {
      total: filtered.length,
      active: countByStatus("active"),
      not_working: countByStatus("not_working"),
      closed: countByStatus("closed"),
      reversal_issue: countByStatus("reversal_issue"),
      under_review: countByStatus("under_review"),
    };
  }

  const [totalRes, ...statusRes] = await Promise.all([
    applyStructuralFilters(
      supabase
        .from("processing_accounts")
        .select("id", { count: "exact", head: true }),
    ),
    ...statuses.map((s) =>
      applyStructuralFilters(
        supabase
          .from("processing_accounts")
          .select("id", { count: "exact", head: true })
          .eq("status", s),
      ),
    ),
  ]);

  return {
    total: totalRes.count || 0,
    active: statusRes[0].count || 0,
    not_working: statusRes[1].count || 0,
    closed: statusRes[2].count || 0,
    reversal_issue: statusRes[3].count || 0,
    under_review: statusRes[4].count || 0,
  };
}

const FULL_SELECT =
  "id, account_type, account_holder_name, routing_number_encrypted, account_number_encrypted, card_number_encrypted, expiration_date, cvv_encrypted, billing_address, status, notes, created_by, created_at, updated_at, creator:users!processing_accounts_created_by_fkey(id, full_name)";

export async function getProcessingAccounts(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProcessingAccountStatus | "all";
  from_date?: string;
  to_date?: string;
  account_type?: string;
}): Promise<{
  data: NormalisedProcessingAccountRow[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const normalizeRow = (
    account: RawProcessingAccountRow,
  ): NormalisedProcessingAccountRow => ({
    ...account,
    routing_number: safeDecrypt(account.routing_number_encrypted),
    account_number: safeDecrypt(account.account_number_encrypted),
    card_number: safeDecrypt(account.card_number_encrypted),
    cvv: safeDecrypt(account.cvv_encrypted),
    expiration_date: account.expiration_date || "",
    account_type: (account.account_type as ProcessingAccountType) || "checkin",
  });

  const applyStructural = (q: SupabaseFilterBuilder) => {
    if (filters?.account_type && filters.account_type !== "all") {
      q = q.eq("account_type", filters.account_type);
    }
    if (filters?.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }
    if (filters?.from_date) {
      q = q.gte("created_at", `${filters.from_date}T00:00:00.000Z`);
    }
    if (filters?.to_date) {
      q = q.lte("created_at", `${filters.to_date}T23:59:59.999Z`);
    }
    return q;
  };

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase().trim();

    // Cap at 300 rows to avoid decrypting thousands of entries in JS.
    let q = supabase
      .from("processing_accounts")
      .select(FULL_SELECT)
      .order("created_at", { ascending: false })
      .limit(300);
    q = applyStructural(q);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const all = ((data as unknown as RawProcessingAccountRow[]) || []).map(
      normalizeRow,
    );

    const filtered = all.filter(
      (a: NormalisedProcessingAccountRow) =>
        (a.account_holder_name || "").toLowerCase().includes(searchLower) ||
        (a.billing_address || "").toLowerCase().includes(searchLower) ||
        (a.notes || "").toLowerCase().includes(searchLower) ||
        (a.expiration_date || "").toLowerCase().includes(searchLower) ||
        (a.routing_number || "").toLowerCase().includes(searchLower) ||
        (a.account_number || "").toLowerCase().includes(searchLower) ||
        (a.card_number || "").toLowerCase().includes(searchLower) ||
        (a.cvv || "").toLowerCase().includes(searchLower),
    );

    const count = filtered.length;
    const paginated = filtered.slice(offset, offset + pageSize);
    return {
      data: paginated,
      count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  let query = supabase
    .from("processing_accounts")
    .select(FULL_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });
  query = applyStructural(query);

  const { data, error, count } = await query.range(
    offset,
    offset + pageSize - 1,
  );
  if (error) throw new Error(error.message);

  const accounts = ((data as unknown as RawProcessingAccountRow[]) || []).map(
    normalizeRow,
  );

  return {
    data: accounts,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
