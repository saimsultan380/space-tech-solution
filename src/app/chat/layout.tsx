import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { ThemeColorsProvider } from "@/components/providers/theme-colors-provider";
import { parseThemeColors, emptyThemeColors } from "@/lib/theme-cookie";
import { ChatThemeHydrator } from "@/components/chat/chat-theme-hydrator";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Team Chat — Space Tech Solution" };

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Skeleton className="h-10 w-48" />
        </div>
      }
    >
      <ChatAuthenticatedLayout>{children}</ChatAuthenticatedLayout>
    </Suspense>
  );
}

async function ChatAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore] = await Promise.all([cookies(), requireAuth()]);
  const themeColors =
    parseThemeColors(cookieStore.get("crm-theme-colors")?.value) ??
    emptyThemeColors();

  return (
    <ThemeColorsProvider
      shell_bg_color={themeColors.shell_bg_color}
      shell_text_color={themeColors.shell_text_color}
      sidebar_color={themeColors.sidebar_color}
      sidebar_text_color={themeColors.sidebar_text_color}
      button_color={themeColors.button_color}
      button_text_color={themeColors.button_text_color}
      active_tab_color={themeColors.active_tab_color}
      active_tab_text_color={themeColors.active_tab_text_color}
      chat_user_bubble_color={themeColors.chat_user_bubble_color}
      chat_user_bubble_text_color={themeColors.chat_user_bubble_text_color}
      chat_bot_bubble_color={themeColors.chat_bot_bubble_color}
      chat_bot_bubble_text_color={themeColors.chat_bot_bubble_text_color}
    >
      <ChatThemeHydrator />
      <div className="h-screen w-screen overflow-hidden bg-background font-[family-name:var(--font-dm-sans)]">
        {children}
      </div>
    </ThemeColorsProvider>
  );
}
