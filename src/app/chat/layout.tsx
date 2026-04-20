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
  const settings = await getCompanySettings();

  return (
    <ThemeColorsProvider
      shell_bg_color={settings.shell_bg_color}
      shell_text_color={settings.shell_text_color}
      sidebar_color={settings.sidebar_color}
      sidebar_text_color={settings.sidebar_text_color}
      button_color={settings.button_color}
      button_text_color={settings.button_text_color}
      active_tab_color={settings.active_tab_color}
      active_tab_text_color={settings.active_tab_text_color}
      chat_user_bubble_color={settings.chat_user_bubble_color}
      chat_user_bubble_text_color={settings.chat_user_bubble_text_color}
      chat_bot_bubble_color={settings.chat_bot_bubble_color}
      chat_bot_bubble_text_color={settings.chat_bot_bubble_text_color}
    >
      <div className="h-screen w-screen overflow-hidden bg-background">
        {children}
      </div>
    </ThemeColorsProvider>
  );
}
