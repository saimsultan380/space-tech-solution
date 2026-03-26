import { requireAuth } from "@/lib/auth";
import { getAttendance, getMonthlyAttendanceSummary } from "@/lib/actions/attendance";
import { getUsers } from "@/lib/actions/users";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";

export default async function AttendancePage(props: {
  searchParams: Promise<{ month?: string; page?: string; user_id?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = searchParams.month ?? currentMonth;
  const page = Number(searchParams.page) || 1;
  const user_id = searchParams.user_id || (user.role === "super_admin" ? "all" : user.id);

  const isSuperAdmin = user.role === "super_admin";

  const attendanceFilters = {
    month,
    user_id,
    page,
    pageSize: 10,
  };
  const summaryMonth = month;

  const [attendanceResponse, usersResponse, monthlySummary, leaves, attendanceSettings] = await Promise.all([
    getAttendance(attendanceFilters),
    getUsers(),
    isSuperAdmin
      ? getMonthlyAttendanceSummary(summaryMonth)
      : getMonthlyAttendanceSummary(summaryMonth, user.id),
    isSuperAdmin
      ? getAllLeaves({ status: "approved" })
      : getLeavesForCurrentUser({ status: "approved" }),
    getAttendanceSettings(),
  ]);

  const allUsers = usersResponse.data;

  const visibleUsers = isSuperAdmin
    ? allUsers
    : allUsers.filter((u: { id: string }) => u.id === user.id);

  return (
    <AttendanceClient
      attendanceResponse={attendanceResponse}
      users={visibleUsers}
      userRole={user.role}
      monthlySummary={monthlySummary}
      leaves={leaves.data}
      attendanceSettings={attendanceSettings}
      initialMonth={month}
    />
  );
}
