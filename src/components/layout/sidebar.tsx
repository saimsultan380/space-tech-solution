"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  Users,
  Contact,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Clock,
  BarChart3,
  Settings,
  X,
  Zap,
  CalendarDays,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Contact,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Clock,
  BarChart3,
  Settings,
  CalendarDays,
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  userAvatarUrl?: string | null;
  allowedModules?: string[] | null;
  collapsed: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  role,
  userName,
  userAvatarUrl,
  allowedModules,
  collapsed,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const baseItems = NAV_ITEMS[role] || [];
  const navItems =
    allowedModules && allowedModules.length > 0
      ? baseItems.filter((item) => allowedModules.includes(item.href))
      : baseItems;
  const isMobileOpen = mobileOpen ?? false;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "flex h-full flex-col border-r border-border/50 bg-card transition-all duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-50 w-[17rem] lg:static lg:z-auto lg:shrink-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]"
        )}
      >
      {/* Brand + mobile close */}
      <div className="flex h-[4.25rem] items-center justify-between gap-2 px-3.5 border-b border-border/50">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 group" onClick={onCloseMobile}>
          <div className="flex h-9 w-9 items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {(!collapsed || isMobileOpen) && (
            <div className="min-w-0">
              <span className="text-[15px] font-bold tracking-tight">Space Tech Solution</span>
              <span className="ml-1.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                v2
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2.5 py-3 overflow-y-auto">
        {(!collapsed || isMobileOpen) && (
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                (collapsed && !isMobileOpen) && "justify-center px-2"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              )}
              {(!collapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user info section */}
      {(!collapsed || isMobileOpen) && (
        <div className="border-t border-border/50 p-4">
          <div className="rounded-xl bg-primary/5 border border-primary/10 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground shadow-sm overflow-hidden">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userAvatarUrl}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {ROLE_LABELS[role]}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      </aside>
    </>
  );
}
