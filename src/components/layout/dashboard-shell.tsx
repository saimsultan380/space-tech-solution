"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { UserRole } from "@/lib/types";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { ThemeColorsProvider } from "@/components/providers/theme-colors-provider";
import { InactivityTracker } from "@/components/auth/inactivity-tracker";
import type { ThemeColors } from "@/lib/actions/company-settings";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const isCompactDesktop = useMediaQuery("(max-width: 1279px)");
  const effectiveSidebarCollapsed = isMobile ? sidebarCollapsed : isCompactDesktop || sidebarCollapsed;

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
        sidebar_color={themeColors?.sidebar_color ?? null}
        sidebar_text_color={themeColors?.sidebar_text_color ?? null}
        button_color={themeColors?.button_color ?? null}
        button_text_color={themeColors?.button_text_color ?? null}
        active_tab_color={themeColors?.active_tab_color ?? null}
        active_tab_text_color={themeColors?.active_tab_text_color ?? null}
        chat_user_bubble_color={themeColors?.chat_user_bubble_color ?? null}
        chat_user_bubble_text_color={themeColors?.chat_user_bubble_text_color ?? null}
        chat_bot_bubble_color={themeColors?.chat_bot_bubble_color ?? null}
        chat_bot_bubble_text_color={themeColors?.chat_bot_bubble_text_color ?? null}
      >
      <InactivityTracker />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          role={role}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
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
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-7xl animate-[fade-in_0.3s_ease-out]">
              {children}
            </div>
          </main>
        </div>
      </div>
      </ThemeColorsProvider>
    </CurrencyProvider>
  );
}
