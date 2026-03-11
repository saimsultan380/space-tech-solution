import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <DashboardShell
      role={user.role}
      userName={user.full_name}
      userAvatarUrl={user.avatar_url ?? null}
      currency={user.preferred_currency ?? "USD"}
      userId={user.id}
      allowedModules={user.allowed_modules ?? null}
    >
      {children}
    </DashboardShell>
  );
}
