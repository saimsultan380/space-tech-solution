import { requireAuth } from "@/lib/auth";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { ThemeColorsProvider } from "@/components/providers/theme-colors-provider";

export const metadata = { title: "Team Chat — Space Tech Solution" };

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const companySettings = await getCompanySettings();

  return (
    <ThemeColorsProvider
      shell_bg_color={companySettings.shell_bg_color}
      shell_text_color={companySettings.shell_text_color}
      sidebar_color={companySettings.sidebar_color}
      sidebar_text_color={companySettings.sidebar_text_color}
      button_color={companySettings.button_color}
      button_text_color={companySettings.button_text_color}
      active_tab_color={companySettings.active_tab_color}
      active_tab_text_color={companySettings.active_tab_text_color}
      chat_user_bubble_color={companySettings.chat_user_bubble_color}
      chat_user_bubble_text_color={companySettings.chat_user_bubble_text_color}
      chat_bot_bubble_color={companySettings.chat_bot_bubble_color}
      chat_bot_bubble_text_color={companySettings.chat_bot_bubble_text_color}
    >
      <div className="h-screen w-screen overflow-hidden bg-background font-[family-name:var(--font-dm-sans)]">
        {children}
      </div>
    </ThemeColorsProvider>
  );
}
