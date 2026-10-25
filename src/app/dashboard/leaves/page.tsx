import { requireAuth } from "@/lib/auth";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";
import { LeavesAdminClient } from "@/components/leaves/leaves-admin-client";
import { MyLeavesClient } from "@/components/leaves/my-leaves-client";
import type { Leave, LeaveStatus, UserRole } from "@/lib/types";

interface LeavesQueryUserResult {
  id: string;
  full_name: string;
  role: string;
}

function formatLeavesResponse(response: {
  data: any[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}) {
  return {
    ...response,
    data: response.data.map((l) => {
      const uResult = l.user as unknown as LeavesQueryUserResult | null;
      const appResult = l.approver as unknown as { id: string; full_name: string } | null;
      return {
        id: String(l.id || ""),
        user_id: String(l.user_id || ""),
        start_date: String(l.start_date || ""),
        end_date: String(l.end_date || ""),
        type: String(l.type || "Other"),
        reason: String(l.reason || ""),
        status: l.status as LeaveStatus,
        approver_id: l.approver_id ? String(l.approver_id) : null,
        approver_notes: l.approver_notes ? String(l.approver_notes) : null,
        source: (l.source as "manual" | "auto") || "manual",
        created_at: String(l.created_at || ""),
        updated_at: String(l.updated_at || l.created_at || ""),
        user: uResult ? {
          id: String(uResult.id || ""),
          full_name: String(uResult.full_name || ""),
          role: uResult.role as UserRole,
          email: "",
          employee_id: null,
          is_active: true,
          created_at: "",
        } : undefined,
        approver: appResult ? {
          id: String(appResult.id || ""),
          full_name: String(appResult.full_name || ""),
          role: "super_admin" as UserRole,
          email: "",
          employee_id: null,
          is_active: true,
          created_at: "",
        } : undefined,
      } as Leave;
    }),
  };
}

export default async function LeavesPage(props: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = (searchParams.status as LeaveStatus | "all") || "all";

  if (user.role === "super_admin") {
    const leavesResponse = await getAllLeaves({ page, pageSize: 20, status });
    return <LeavesAdminClient leavesResponse={formatLeavesResponse(leavesResponse)} />;
  }

  const leavesResponse = await getLeavesForCurrentUser({ page, pageSize: 20, status });
  return <MyLeavesClient leavesResponse={formatLeavesResponse(leavesResponse)} userRole={user.role} />;
}
