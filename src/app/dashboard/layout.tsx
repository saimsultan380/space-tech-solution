import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardLayoutFallback } from "@/components/layout/dashboard-layout-fallback";
import { parseThemeColors } from "@/lib/theme-cookie";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardAuthenticatedLayout>{children}</DashboardAuthenticatedLayout>
    </Suspense>
  );
}

async function DashboardAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme comes from cookie (instant) — no DB wait on every navigation.
  // DashboardShell refreshes theme in the background and updates the cookie.
  const [user, cookieStore] = await Promise.all([requireAuth(), cookies()]);
  const themeColors = parseThemeColors(
    cookieStore.get("crm-theme-colors")?.value,
  );

  return (
    <DashboardShell
      role={user.role}
      userName={user.full_name}
      userAvatarUrl={user.avatar_url ?? null}
      currency={user.preferred_currency ?? "USD"}
      userId={user.id}
      allowedModules={user.allowed_modules ?? null}
      themeColors={themeColors ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
