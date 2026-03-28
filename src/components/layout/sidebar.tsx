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
  ReceiptText,
  Megaphone,
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
  ReceiptText,
  Megaphone,
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

const SECTION_CONFIG: Record<UserRole, Array<{ title: string; hrefs: string[] }>> = {
  super_admin: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/dashboard/reports"],
    },
    {
      title: "HR Services",
      hrefs: ["/dashboard/attendance", "/dashboard/payslips", "/dashboard/leaves"],
    },
    {
      title: "Employee Management",
      hrefs: ["/dashboard/users", "/dashboard/call-logs-responses", "/dashboard/sales", "/dashboard/chargebacks"],
    },
    {
      title: "Finance & System",
      hrefs: [/* "/dashboard/payments", */ "/dashboard/marketing-budget", "/dashboard/settings"],
    },
  ],
  sales_agent: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/dashboard/call-logs-responses", "/dashboard/sales"],
    },
    {
      title: "HR Services",
      hrefs: ["/dashboard/payslips", "/dashboard/attendance", "/dashboard/leaves"],
    },
    {
      title: "System",
      hrefs: ["/dashboard/settings"],
    },
  ],
  processor: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/dashboard/call-logs-responses", "/dashboard/sales"],
    },
    {
      title: "HR Services",
      hrefs: ["/dashboard/payslips", "/dashboard/attendance", "/dashboard/leaves"],
    },
    {
      title: "Risk",
      hrefs: ["/dashboard/chargebacks"],
    },
    {
      title: "Finance & System",
      hrefs: ["/dashboard/marketing-budget", "/dashboard/settings"],
    },
  ],
};

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
  const fullRoleItems = NAV_ITEMS[role] || [];
  const legacyModuleAliases: Record<string, string[]> = {
    "/dashboard/call-logs-responses": ["/dashboard/customers"],
  };
  /** Processors only see Call Logs if an admin adds it to allowed_modules; role default omits it. */
  const defaultNavItems =
    role === "processor"
      ? fullRoleItems.filter((item) => item.href !== "/dashboard/call-logs-responses")
      : fullRoleItems;
  const navItems =
    role !== "super_admin" && allowedModules && allowedModules.length > 0
      ? fullRoleItems.filter((item) =>
          allowedModules.includes(item.href) ||
          (legacyModuleAliases[item.href] || []).some((legacyHref) => allowedModules.includes(legacyHref))
        )
      : defaultNavItems;
  const navItemMap = new Map(navItems.map((item) => [item.href, item]));
  const roleSections = SECTION_CONFIG[role] ?? [];
  const visibleSections = roleSections
    .map((section) => ({
      title: section.title,
      items: section.hrefs.map((href) => navItemMap.get(href)).filter((item): item is (typeof navItems)[number] => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0);
  const sectionedHrefs = new Set(visibleSections.flatMap((section) => section.items.map((item) => item.href)));
  const ungroupedItems = navItems.filter((item) => !sectionedHrefs.has(item.href));
  const allSections = [
    ...visibleSections,
    ...(ungroupedItems.length > 0 ? [{ title: "More", items: ungroupedItems }] : []),
  ];
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
          "flex h-full flex-col bg-card text-muted-foreground transition-all duration-300 ease-in-out border-r border-border",
          "fixed inset-y-0 left-0 z-50 w-[17rem] lg:static lg:z-auto lg:shrink-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",  
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]"
        )}
      >
      {/* Brand + mobile close */}
      <div className="flex h-[4.5rem] items-center justify-between gap-2 px-6 border-b border-border">
        <Link href="/dashboard" className="flex min-w-0 items-center group" onClick={onCloseMobile}>
          {(!collapsed || isMobileOpen) && (
            <span className="text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
              Space Tech Solution
            </span>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {allSections.map((section) => (
          <div
            key={section.title}
            className={cn(
              "space-y-1 rounded-md border border-border bg-card/30 px-2 py-2.5 shadow-sm",
              collapsed && !isMobileOpen && "px-1.5"
            )}
          >
            {(!collapsed || isMobileOpen) && (
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  {section.title}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item, idx) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        (collapsed && !isMobileOpen) && "justify-center px-2"
                      )}
                    >
                      {Icon && (
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200",
                            isActive 
                              ? "bg-primary-foreground/10 border-primary-foreground/20" 
                              : "bg-background border-border shadow-sm group-hover:border-primary/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[15px] w-[15px] transition-transform duration-200 group-hover:scale-110",
                              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                        </div>
                      )}
                      {(!collapsed || isMobileOpen) && (
                        <span className={cn("truncate", isActive && "font-bold")}>{item.label}</span>
                      )}
                    </Link>
                    {!isActive && idx < section.items.length - 1 && !collapsed && (
                      <div className="mx-3 my-0.5 h-px bg-border/30" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user info section */}
      {(!collapsed || isMobileOpen) && (
        <div className="p-4 border-t border-border/50">
          <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-foreground shadow-sm overflow-hidden border border-border">
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
                <p className="text-sm font-semibold truncate text-foreground">{userName}</p>
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
