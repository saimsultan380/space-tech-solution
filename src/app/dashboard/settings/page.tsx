import { requireAuth } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { getUsers } from "@/lib/actions/users";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { listCallSetupCharges, type CallSetupCharge } from "@/lib/actions/call-setup-charges";
import type { AppUser, UserRole } from "@/lib/types";

export default async function SettingsPage() {
  const user = await requireAuth();
  let manageableUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    allowed_modules: string[] | null;
  }> = [];

  const [attendanceSettings, companySettings, usersResponse, callSetupCharges] = await Promise.all([
    getAttendanceSettings(),
    getCompanySettings(),
    user.role === "super_admin" ? getUsers({ pageSize: 500 }) : Promise.resolve(null),
    user.role === "super_admin" ? listCallSetupCharges() : Promise.resolve([] as CallSetupCharge[]),
  ]);

  if (user.role === "super_admin" && usersResponse) {
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
      callSetupCharges={callSetupCharges}
    />
  );
}

