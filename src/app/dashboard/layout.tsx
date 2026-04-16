import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCompanySettings } from "@/lib/actions/company-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, companySettings] = await Promise.all([
    requireAuth(),
    getCompanySettings(),
  ]);

  return (
    <DashboardShell
      role={user.role}
      userName={user.full_name}
      userAvatarUrl={user.avatar_url ?? null}
      currency={user.preferred_currency ?? "USD"}
      userId={user.id}
      allowedModules={user.allowed_modules ?? null}
      themeColors={{
        sidebar_color: companySettings.sidebar_color,
        sidebar_text_color: companySettings.sidebar_text_color,
        button_color: companySettings.button_color,
        button_text_color: companySettings.button_text_color,
        active_tab_color: companySettings.active_tab_color,
        active_tab_text_color: companySettings.active_tab_text_color,
      }}
    >
      {children}
    </DashboardShell>
  );
}
