import { requireAuth } from "@/lib/auth";
import { getAttendance, getMonthlyAttendanceSummary } from "@/lib/actions/attendance";
import { getUsers } from "@/lib/actions/users";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import type { Leave, LeaveStatus, UserRole } from "@/lib/types";

export default async function AttendancePage(props: {
  searchParams: Promise<{ month?: string; user_id?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = searchParams.month ?? currentMonth;
  const user_id = searchParams.user_id || (user.role === "super_admin" ? "all" : user.id);

  const isSuperAdmin = user.role === "super_admin";

  // Daily table paginates client-side (and merges leave-only rows), so fetch the
  // full month here. Do not use the table `page` / `daily_page` URL for this query.
  const attendanceFilters = {
    month,
    user_id,
    page: 1,
    pageSize: 2000,
  };

  const [attendanceResponse, usersResponse, monthlySummary, leaves, attendanceSettings] = await Promise.all([
    getAttendance(attendanceFilters),
    getUsers({ pageSize: 500 }),
    isSuperAdmin
      ? getMonthlyAttendanceSummary(month)
      : getMonthlyAttendanceSummary(month, user.id),
    isSuperAdmin
      ? getAllLeaves({ status: "approved", month, pageSize: 500 })
      : getLeavesForCurrentUser({ status: "approved", month, pageSize: 500 }),
    getAttendanceSettings(),
  ]);

  const allUsers = usersResponse.data;

  const visibleUsers = isSuperAdmin
    ? allUsers
    : allUsers.filter((u: { id: string }) => u.id === user.id);

  interface LeavesQueryUserResult {
    id: string;
    full_name: string;
    role: string;
  }

  const formattedLeaves: Leave[] = leaves.data.map((l) => {
    const uResult = l.user as unknown as LeavesQueryUserResult | null;
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
    };
  });

  return (
    <AttendanceClient
      attendanceResponse={attendanceResponse}
      users={visibleUsers}
      userRole={user.role}
      monthlySummary={monthlySummary}
      leaves={formattedLeaves}
      attendanceSettings={attendanceSettings}
    />
  );
}
