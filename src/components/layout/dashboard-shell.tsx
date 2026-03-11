"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { UserRole } from "@/lib/types";
import { CurrencyProvider } from "@/components/providers/currency-provider";

interface DashboardShellProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
  userAvatarUrl?: string | null;
  currency?: string | null;
  userId?: string;
  allowedModules?: string[] | null;
}

export function DashboardShell({
  children,
  role,
  userName,
  userAvatarUrl,
  currency,
  userId,
  allowedModules,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <CurrencyProvider currency={currency}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          role={role}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          allowedModules={allowedModules}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={closeMobileMenu}
        />
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <Header
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            userId={userId}
            collapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            isMobile={isMobile}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-7xl animate-[fade-in_0.3s_ease-out]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
