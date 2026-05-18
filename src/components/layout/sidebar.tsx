"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { useRouteLoading } from "@/components/providers/route-loading-provider";
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
  CalendarDays,
  ReceiptText,
  Megaphone,
  MessageCircle,
  ExternalLink,
  StickyNote,
} from "@/components/ui/icons";
// Removed PersonalNotepad import

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
  MessageCircle,
  StickyNote,
};



interface SidebarProps {
  role: UserRole;
  allowedModules?: string[] | null;
  collapsed: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const SECTION_CONFIG: Record<UserRole, { title: string; hrefs: string[] }[]> = {
  super_admin: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/dashboard/reports", "/chat", "/dashboard/personal-notepad"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/users",
        "/dashboard/attendance",
        "/dashboard/leaves",
        "/dashboard/payslips",
      ],
    },
    {
      title: "Operations",
      hrefs: [
        "/dashboard/sales",
        "/dashboard/processing-accounts",
        "/dashboard/call-logs-responses",
        "/dashboard/marketing-budget",
        "/dashboard/chargebacks",
      ],
    },
    {
      title: "System",
      hrefs: ["/dashboard/settings"],
    },
  ],
  sales_agent: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/dashboard/sales-performance", "/chat", "/dashboard/personal-notepad"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/attendance",
        "/dashboard/leaves",
        "/dashboard/payslips",
      ],
    },
    {
      title: "Operations",
      hrefs: [
        "/dashboard/sales",
        "/dashboard/processing-accounts",
        "/dashboard/call-logs-responses",
        "/dashboard/chargebacks",
      ],
    },
    {
      title: "System",
      hrefs: ["/dashboard/settings"],
    },
  ],
  processor: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/chat", "/dashboard/personal-notepad"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/attendance",
        "/dashboard/leaves",
        "/dashboard/payslips",
      ],
    },
    {
      title: "Operations",
      hrefs: [
        "/dashboard/sales",
        "/dashboard/processing-accounts",
        "/dashboard/call-logs-responses",
        "/dashboard/marketing-budget",
        "/dashboard/chargebacks",
      ],
    },
    {
      title: "System",
      hrefs: ["/dashboard/settings"],
    },
  ],
};

export function Sidebar({
  role,
  allowedModules,
  collapsed,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { isLoading, targetPath } = useRouteLoading();
  
  // During navigation, only highlight the target route, not the current one
  const isActiveHref = (href: string) => {
    // If we're navigating, only show active state for the target
    if (isLoading && targetPath) {
      return targetPath === href || (href !== "/dashboard" && targetPath.startsWith(`${href}/`));
    }
    // Otherwise use current pathname
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  };
  const fullRoleItems = NAV_ITEMS[role] || [];
  const legacyModuleAliases: Record<string, string[]> = {
    "/dashboard/call-logs-responses": ["/dashboard/customers"],
  };
  /** Processors only see Call Logs if an admin adds it to allowed_modules; role default omits it. */
  const defaultNavItems =
    role === "processor"
      ? fullRoleItems.filter(
          (item) => item.href !== "/dashboard/call-logs-responses",
        )
      : fullRoleItems;
  const navItems =
    role !== "super_admin" && allowedModules && allowedModules.length > 0
      ? fullRoleItems.filter(
          (item) =>
            allowedModules.includes(item.href) ||
            (legacyModuleAliases[item.href] || []).some((legacyHref) =>
              allowedModules.includes(legacyHref),
            ),
        )
      : defaultNavItems;
  const navItemMap = new Map(navItems.map((item) => [item.href, item]));
  const roleSections = SECTION_CONFIG[role] ?? [];
  const visibleSections = roleSections
    .map((section) => ({
      title: section.title,
      items: section.hrefs
        .map((href) => navItemMap.get(href))
        .filter((item): item is (typeof navItems)[number] => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0);


  const isMobileOpen = mobileOpen ?? false;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        style={{
          backgroundColor: "var(--theme-shell-bg-color, hsl(var(--background)))",
          color: "var(--theme-shell-text-color, hsl(var(--foreground)))",
        }}
        className={cn(
          "flex h-full flex-col transition-all duration-300 ease-in-out border-r border-foreground/10",
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:shrink-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "w-[17rem] lg:w-[14rem] xl:w-[15rem] 2xl:w-[17rem]",
        )}
      >
        {/* Brand + mobile close */}
        <div className="flex h-14 xl:h-16 items-center justify-between gap-2 px-4 xl:px-6 border-b border-current/5 bg-current/[0.02] backdrop-blur-sm">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center group"
            onClick={onCloseMobile}
          >
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold tracking-tight whitespace-nowrap leading-none">
                  Space Tech Solution
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-[inherit] opacity-70 hover:opacity-100 hover:bg-muted/20 transition-colors lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 space-y-6 overflow-y-auto px-4 py-6 no-scrollbar",
            collapsed && "space-y-8 px-3 py-8",
          )}
        >
          {visibleSections.map((section) => (
            <div
              key={section.title}
              className={cn(
                "space-y-2 px-1",
                collapsed && "px-0",
              )}
            >
              {!collapsed && (
                <div className="flex items-center gap-2 px-2 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {section.title}
                  </span>
                  <div className="h-px flex-1 bg-emerald-500/20" />
                </div>
              )}
              <div
                className={cn(
                  "space-y-1 p-1.5 rounded-2xl border border-current/10 bg-current/[0.02]",
                  collapsed && "space-y-3 p-1",
                )}
              >
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = isActiveHref(item.href);
                  const isCollapsedRail = collapsed;
                  const opensNewTab = "newTab" in item && item.newTab;
                  const LinkEl = opensNewTab ? "a" : Link;
                  const linkProps = opensNewTab
                    ? {
                        href: item.href,
                        target: "_blank" as const,
                        rel: "noopener noreferrer",
                      }
                    : { href: item.href };
                  


                  return (
                    <div
                      key={item.href}
                      className={cn(isCollapsedRail && "w-full flex justify-center")}
                    >
                        <LinkEl
                        {...linkProps}
                        onClick={onCloseMobile}
                        className={cn(
                            "group flex items-center rounded-xl transition-all duration-200",
                            isCollapsedRail
                              ? "h-11 w-11 justify-center p-0"
                              : "gap-3 px-3 py-2",
                            isActive
                              ? "sidebar-active-item"
                              : "hover:bg-foreground/[0.05] text-[inherit] opacity-70 hover:opacity-100",
                          )}
                        style={isActive ? {
                          backgroundColor: "var(--theme-sidebar-color, hsl(var(--primary)))",
                          color: "var(--theme-sidebar-text-color, hsl(var(--primary-foreground)))"
                        } : {}}
                      >
                        <div className={cn(
                          "flex shrink-0 items-center justify-center transition-all duration-200",
                          isCollapsedRail ? "h-9 w-9" : "h-8 w-8",
                        )}>
                          {Icon && (
                            <Icon
                              className={cn(
                                "transition-colors",
                                isCollapsedRail ? "h-5 w-5" : "h-4 w-4",
                                "text-[inherit]"
                              )}
                            />
                          )}
                        </div>
                        {!isCollapsedRail && (
                          <>
                            <span
                              className={cn(
                                "truncate flex-1 text-sm font-semibold tracking-tight text-[inherit]",
                              )}
                            >
                              {item.label}
                            </span>
                            {opensNewTab && (
                              <ExternalLink className={cn("h-3 w-3 shrink-0 text-[inherit] opacity-40")} />
                            )}
                            {isActive && (
                              <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                            )}
                          </>
                        )}
                      </LinkEl>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
        </nav>


      </aside>
    </>
  );
}
