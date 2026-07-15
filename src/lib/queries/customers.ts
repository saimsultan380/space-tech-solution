import { createClient } from "@/lib/supabase/client";
import { sanitizeFilterValue } from "@/lib/utils";
import type { CustomerListItem } from "@/lib/types";

export async function getCallLogAgents(): Promise<string[]> {
  const supabase = createClient();
  // O(active users) instead of scanning every call-log customer row.
  const { data, error } = await supabase
    .from("users")
    .select("full_name")
    .eq("is_active", true)
    .in("role", ["sales_agent", "processor", "super_admin"])
    .order("full_name", { ascending: true })
    .limit(200);

  if (error) return [];

  return (data || [])
    .map((row) => String(row.full_name || "").trim())
    .filter(Boolean);
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
  agentName?: string;
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

  // Resolve agent name to user IDs for server-side filtering
  let agentUserIds: string[] | null = null;
  if (filters?.agentName?.trim()) {
    const { data: agentUsers } = await supabase
      .from("users")
      .select("id")
      .eq("full_name", filters.agentName.trim());
    agentUserIds = ((agentUsers || []) as Array<{ id: string }>).map((u) => u.id);
    if (agentUserIds.length === 0) {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CustomerFilterBuilder = any;

  const applySharedFilters = (query: CustomerFilterBuilder): CustomerFilterBuilder => {
    let next = query;
    if (agentUserIds && agentUserIds.length > 0) {
      next = next.in("created_by", agentUserIds);
    }
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

  // Embed the most recent note inline via a nested join so we avoid a serial
  // second round-trip to fetch notes after the customer list resolves.
  const CUSTOMER_SELECT =
    "id, name, email, phone, address, account_no, dob, created_at, " +
    "created_by_user:users!customers_created_by_fkey(full_name), " +
    "notes(content, created_at)";

  const query = applySharedFilters(
    supabase
      .from("customers")
      .select(CUSTOMER_SELECT, { count: "exact" })
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
      new Set(
        (salesCustomerRows || [])
          .map((row: { customer_id: string | null }) => row.customer_id)
          .filter(Boolean),
      ),
    ) as string[];

    let fallbackQuery = applySharedFilters(
      supabase
        .from("customers")
        .select(CUSTOMER_SELECT, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    );
    if (salesCustomerIds.length > 0) {
      fallbackQuery = fallbackQuery.not(
        "id",
        "in",
        `(${salesCustomerIds.join(",")})`,
      );
    }
    const fallbackResult = await fallbackQuery.range(
      offset,
      offset + pageSize - 1,
    );
    data = fallbackResult.data;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (error) throw new Error(error.message);

  const customers = (data || []) as Array<
    { id: string; notes?: Array<{ content: string; created_at: string }> } & Record<string, unknown>
  >;

  const enriched: CustomerListItem[] = customers.map((c) => {
    // Notes arrive newest-first from the nested select; pick the first one.
    const notesArr = (c.notes || []) as Array<{
      content: string;
      created_at: string;
    }>;
    notesArr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const recent = notesArr[0] || null;
    return {
      ...c,
      notes: undefined,
      recent_note: recent?.content || null,
      recent_note_created_at: recent?.created_at || null,
    } as unknown as CustomerListItem;
  });

  return {
    data: enriched,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
