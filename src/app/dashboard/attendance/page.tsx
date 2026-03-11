import { requireAuth } from "@/lib/auth";
import { getAttendance, getMonthlyAttendanceSummary } from "@/lib/actions/attendance";
import { getUsers } from "@/lib/actions/users";
import { AttendanceClient } from "@/components/attendance/attendance-client";

export default async function AttendancePage() {
  const user = await requireAuth();

  const isSuperAdmin = user.role === "super_admin";

  const [attendance, users, monthlySummary] = await Promise.all([
    isSuperAdmin ? getAttendance() : getAttendance({ user_id: user.id }),
    getUsers(),
    isSuperAdmin ? getMonthlyAttendanceSummary() : getMonthlyAttendanceSummary(undefined, user.id),
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
    />
  );
}
