import { requireAuth } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { getUsers } from "@/lib/actions/users";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";

export default async function SettingsPage() {
  const user = await requireAuth();
  let manageableUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: "super_admin" | "sales_agent" | "processor";
    allowed_modules: string[] | null;
  }> = [];
  let attendanceSettings = await getAttendanceSettings();

  if (user.role === "super_admin") {
    const [users, settings] = await Promise.all([getUsers(), getAttendanceSettings()]);
    attendanceSettings = settings;
    manageableUsers = users.map((entry) => ({
      id: entry.id,
      full_name: entry.full_name,
      email: entry.email,
      role: entry.role,
      allowed_modules: entry.allowed_modules ?? null,
    }));
  }

  return (
    <SettingsClient
      user={user}
      manageableUsers={manageableUsers}
      attendanceSettings={attendanceSettings}
    />
  );
}

