import { requireAuth } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { getUsers } from "@/lib/actions/users";

export default async function SettingsPage() {
  const user = await requireAuth();
  let manageableUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: "super_admin" | "sales_agent" | "processor";
    allowed_modules: string[] | null;
  }> = [];

  if (user.role === "super_admin") {
    const users = await getUsers();
    manageableUsers = users.map((entry) => ({
      id: entry.id,
      full_name: entry.full_name,
      email: entry.email,
      role: entry.role,
      allowed_modules: entry.allowed_modules ?? null,
    }));
  }

  return <SettingsClient user={user} manageableUsers={manageableUsers} />;
}

