import { requireAuth } from "@/lib/auth";
import { getAttendance, getMonthlyAttendanceSummary } from "@/lib/actions/attendance";
import { getUsers } from "@/lib/actions/users";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";

export default async function AttendancePage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = searchParams.month ?? currentMonth;

  const isSuperAdmin = user.role === "super_admin";

  const attendanceFilters = {
    month,
    ...(isSuperAdmin ? {} : { user_id: user.id }),
  };
  const summaryMonth = month;

  const [attendance, users, monthlySummary, leaves] = await Promise.all([
    getAttendance(attendanceFilters),
    getUsers(),
    isSuperAdmin
      ? getMonthlyAttendanceSummary(summaryMonth)
      : getMonthlyAttendanceSummary(summaryMonth, user.id),
    isSuperAdmin
      ? getAllLeaves({ status: "approved" })
      : getLeavesForCurrentUser({ status: "approved" }),
  ]);

  const visibleUsers = isSuperAdmin
    ? users
    : users.filter((u: { id: string }) => u.id === user.id);

  return (
    <AttendanceClient
      attendance={attendance}
      users={visibleUsers}
      userRole={user.role}
      monthlySummary={monthlySummary}
      leaves={leaves}
      initialMonth={month}
    />
  );
}
