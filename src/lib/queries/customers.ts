import { createClient } from "@/lib/supabase/client";
import { sanitizeFilterValue } from "@/lib/utils";
import type { CustomerListItem } from "@/lib/types";

export async function getCallLogAgents(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("created_by_user:users!customers_created_by_fkey(full_name)")
    .eq("source", "call_log")
    .is("deleted_at", null);

  if (error) return [];

  const unique = new Map<string, string>();
  (data || []).forEach((row: { created_by_user?: { full_name?: string } | null }) => {
    const name = String(row.created_by_user?.full_name || "").trim();
    if (name) unique.set(name.toLowerCase(), name);
  });
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}

function createdAtDayBoundsUtc(yyyyMmDd: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  const [y, m, d] = yyyyMmDd.trim().split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const start = `${yyyyMmDd.trim()}T00:00:00.000Z`;
  const endUtc = new Date(Date.UTC(y, m - 1, d + 1));
  const end = endUtc.toISOString();
  return { start, end };
}

function dateOnlyUtcStart(yyyyMmDd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  return `${yyyyMmDd.trim()}T00:00:00.000Z`;
}

function dateOnlyUtcEnd(yyyyMmDd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return null;
  return `${yyyyMmDd.trim()}T23:59:59.999Z`;
}

function isMissingSourceColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("source") && (message.includes("column") || message.includes("schema cache"));
}

export async function getCustomers(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  createdFromDate?: string;
  createdToDate?: string;
}): Promise<{
  data: CustomerListItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CustomerFilterBuilder = any;

  const applySharedFilters = (query: CustomerFilterBuilder): CustomerFilterBuilder => {
    let next = query;
    if (filters?.search) {
      const safe = sanitizeFilterValue(filters.search);
      next = next.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,account_no.ilike.%${safe}%`);
    }
    if (filters?.createdFromDate?.trim() && filters?.createdToDate?.trim() && filters.createdFromDate === filters.createdToDate) {
      const dayBounds = createdAtDayBoundsUtc(filters.createdFromDate.trim());
      if (dayBounds) {
        next = next.gte("created_at", dayBounds.start).lt("created_at", dayBounds.end);
      }
      return next;
    }
    const fromStart = filters?.createdFromDate?.trim() ? dateOnlyUtcStart(filters.createdFromDate.trim()) : null;
    const toEnd = filters?.createdToDate?.trim() ? dateOnlyUtcEnd(filters.createdToDate.trim()) : null;
    if (fromStart) {
      next = next.gte("created_at", fromStart);
    }
    if (toEnd) {
      next = next.lte("created_at", toEnd);
    }
    return next;
  };

  const query = applySharedFilters(
    supabase
      .from("customers")
      .select("id, name, email, phone, address, account_no, dob, created_at, created_by_user:users!customers_created_by_fkey(full_name)", { count: "exact" })
      .eq("source", "call_log")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  );

  let { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (isMissingSourceColumnError(error)) {
    const { data: salesCustomerRows } = await supabase
      .from("sales")
      .select("customer_id")
      .not("customer_id", "is", null);
    const salesCustomerIds = Array.from(
      new Set((salesCustomerRows || []).map((row: { customer_id: string | null }) => row.customer_id).filter(Boolean)),
    ) as string[];

    let fallbackQuery = applySharedFilters(
      supabase
        .from("customers")
        .select("id, name, email, phone, address, account_no, dob, created_at, created_by_user:users!customers_created_by_fkey(full_name)", { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    );
    if (salesCustomerIds.length > 0) {
      fallbackQuery = fallbackQuery.not("id", "in", `(${salesCustomerIds.join(",")})`);
    }
    const fallbackResult = await fallbackQuery.range(offset, offset + pageSize - 1);
    data = fallbackResult.data;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (error) throw new Error(error.message);

  const customers = (data || []) as Array<{ id: string } & Record<string, unknown>>;
  const ids = customers.map((c) => c.id).filter(Boolean);

  const recentNoteByCustomerId = new Map<string, { content: string; created_at: string }>();
  if (ids.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from("notes")
      .select("customer_id, content, created_at")
      .in("customer_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);

    if (notesError) throw new Error(notesError.message);

    (notesData || []).forEach((n: { customer_id: string | null; content: string; created_at: string }) => {
      if (!n.customer_id) return;
      if (!recentNoteByCustomerId.has(n.customer_id)) {
        recentNoteByCustomerId.set(n.customer_id, { content: n.content, created_at: n.created_at });
      }
    });
  }

  const enriched: CustomerListItem[] = customers.map((c) => {
    const recent = recentNoteByCustomerId.get(c.id) || null;
    return {
      ...c,
      recent_note: recent?.content || null,
      recent_note_created_at: recent?.created_at || null,
    } as CustomerListItem;
  });

  return {
    data: enriched,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
