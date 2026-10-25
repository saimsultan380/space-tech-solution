import { requireAuth } from "@/lib/auth";
import { getChargebacks } from "@/lib/actions/chargebacks";
import { ChargebacksClient } from "@/components/chargebacks/chargebacks-client";
import { createClient } from "@/lib/supabase/server";
import type { ChargebackStatus } from "@/lib/types";

export default async function ChargebacksPage(props: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    assigned_to?: string;
    from_date?: string;
    to_date?: string;
    min_amount?: string;
    max_amount?: string;
  }>;
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const q = searchParams.q || "";
  const status = (searchParams.status || "all") as ChargebackStatus | "all" | string;
  const assigned_to = user.role === "sales_agent" ? user.id : searchParams.assigned_to || "all";
  const from_date = searchParams.from_date || "";
  const to_date = searchParams.to_date || "";
  const min_amount = searchParams.min_amount ? Number(searchParams.min_amount) : undefined;
  const max_amount = searchParams.max_amount ? Number(searchParams.max_amount) : undefined;

  const [chargebacksResponse, usersResult] = await Promise.all([
    getChargebacks({
      page,
      pageSize: 20,
      q,
      status,
      assigned_to,
      from_date,
      to_date,
      min_amount: Number.isFinite(min_amount) ? min_amount : undefined,
      max_amount: Number.isFinite(max_amount) ? max_amount : undefined,
    }),
    supabase.from("users").select("id, full_name").eq("is_active", true).order("full_name", { ascending: true }),
  ]);

  const assignees = usersResult.data || [];

  return <ChargebacksClient chargebacksResponse={chargebacksResponse} userRole={user.role} assignees={assignees} />;
}
