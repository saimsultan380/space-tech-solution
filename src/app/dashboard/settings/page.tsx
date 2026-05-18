import { requireAuth } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { getUsers } from "@/lib/actions/users";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import { getCompanySettings } from "@/lib/actions/company-settings";
import type { AppUser } from "@/lib/types";

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
  const companySettings = await getCompanySettings();

  if (user.role === "super_admin") {
    const [usersResponse, settings] = await Promise.all([getUsers(), getAttendanceSettings()]);
    attendanceSettings = settings;
    manageableUsers = usersResponse.data.map((entry: AppUser) => ({
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
      companySettings={companySettings}
    />
  );
}

