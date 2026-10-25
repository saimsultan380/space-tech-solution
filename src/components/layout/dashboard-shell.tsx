"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { UserRole } from "@/lib/types";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { ThemeColorsProvider } from "@/components/providers/theme-colors-provider";
import { InactivityTracker } from "@/components/auth/inactivity-tracker";
import type { ThemeColors } from "@/lib/actions/company-settings";
import { getCompanySettings } from "@/lib/queries/analytics";
import {
  emptyThemeColors,
  pickThemeColors,
  writeThemeCookieClient,
} from "@/lib/theme-cookie";

interface DashboardShellProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
  userAvatarUrl?: string | null;
  currency?: string | null;
  userId?: string;
  allowedModules?: string[] | null;
  themeColors?: ThemeColors;
}

export function DashboardShell({
  children,
  role,
  userName,
  userAvatarUrl,
  currency,
  userId,
  allowedModules,
  themeColors,
}: DashboardShellProps) {
  const pathname = usePathname();
  const isChat = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const isCompactDesktop = useMediaQuery("(max-width: 1279px)");
  const effectiveSidebarCollapsed = isMobile
    ? sidebarCollapsed
    : isCompactDesktop || sidebarCollapsed;

  const { data: liveTheme } = useQuery({
    queryKey: ["company-settings-theme"],
    queryFn: async () => {
      const settings = await getCompanySettings();
      const theme = pickThemeColors(settings);
      writeThemeCookieClient(theme);
      return theme;
    },
    staleTime: 60 * 60 * 1000,
    initialData: themeColors ? pickThemeColors(themeColors) : undefined,
  });

  const resolvedTheme = liveTheme ?? themeColors ?? emptyThemeColors();

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen((v) => !v);
    } else if (isCompactDesktop) {
      return;
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <CurrencyProvider currency={currency}>
      <ThemeColorsProvider
        shell_bg_color={resolvedTheme.shell_bg_color}
        shell_text_color={resolvedTheme.shell_text_color}
        sidebar_color={resolvedTheme.sidebar_color}
        sidebar_text_color={resolvedTheme.sidebar_text_color}
        button_color={resolvedTheme.button_color}
        button_text_color={resolvedTheme.button_text_color}
        active_tab_color={resolvedTheme.active_tab_color}
        active_tab_text_color={resolvedTheme.active_tab_text_color}
        chat_user_bubble_color={resolvedTheme.chat_user_bubble_color}
        chat_user_bubble_text_color={resolvedTheme.chat_user_bubble_text_color}
        chat_bot_bubble_color={resolvedTheme.chat_bot_bubble_color}
        chat_bot_bubble_text_color={resolvedTheme.chat_bot_bubble_text_color}
      >
        <InactivityTracker />
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar
            role={role}
            allowedModules={allowedModules}
            collapsed={effectiveSidebarCollapsed}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={closeMobileMenu}
          />
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            <Header
              userName={userName}
              userAvatarUrl={userAvatarUrl}
              userId={userId}
              role={role}
              collapsed={effectiveSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              isMobile={isMobile}
            />
            <main
              className={
                isChat
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
                  : "flex-1 overflow-y-auto bg-background p-4 sm:p-5 xl:p-6"
              }
            >
              <div
                className={
                  isChat
                    ? "h-full min-h-0 flex-1"
                    : "mx-auto w-full max-w-7xl animate-[fade-in_0.3s_ease-out]"
                }
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </ThemeColorsProvider>
    </CurrencyProvider>
  );
}
