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
  MessageCircle,
  ExternalLink,
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
  MessageCircle,
  Landmark: CreditCard,
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

const SECTION_CONFIG: Record<
  UserRole,
  Array<{ title: string; hrefs: string[] }>
> = {
  super_admin: [
    {
      title: "Main Menu",
      hrefs: ["/dashboard", "/chat", "/dashboard/reports"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/attendance",
        "/dashboard/payslips",
        "/dashboard/leaves",
      ],
    },
    {
      title: "Employee Management",
      hrefs: [
        "/dashboard/users",
        "/dashboard/call-logs-responses",
        "/dashboard/sales",
        "/dashboard/chargebacks",
      ],
    },
    {
      title: "Processing Database",
      hrefs: ["/dashboard/processing-accounts"],
    },
    {
      title: "Finance & System",
      hrefs: [
        /* "/dashboard/payments", */ "/dashboard/marketing-budget",
        "/dashboard/settings",
      ],
    },
  ],
  sales_agent: [
    {
      title: "Main Menu",
      hrefs: [
        "/dashboard",
        "/dashboard/sales-performance",
        "/chat",
        "/dashboard/call-logs-responses",
        "/dashboard/sales",
      ],
    },
    {
      title: "Processing Database",
      hrefs: ["/dashboard/processing-accounts"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/payslips",
        "/dashboard/attendance",
        "/dashboard/leaves",
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
      hrefs: [
        "/dashboard",
        "/chat",
        "/dashboard/call-logs-responses",
        "/dashboard/sales",
      ],
    },
    {
      title: "Processing Database",
      hrefs: ["/dashboard/processing-accounts"],
    },
    {
      title: "HR Services",
      hrefs: [
        "/dashboard/payslips",
        "/dashboard/attendance",
        "/dashboard/leaves",
      ],
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
  const sectionedHrefs = new Set(
    visibleSections.flatMap((section) =>
      section.items.map((item) => item.href),
    ),
  );
  const ungroupedItems = navItems.filter(
    (item) => !sectionedHrefs.has(item.href),
  );
  const allSections = [
    ...visibleSections,
    ...(ungroupedItems.length > 0
      ? [{ title: "More", items: ungroupedItems }]
      : []),
  ];
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
          backgroundColor: "var(--theme-shell-bg-color, hsl(var(--card)))",
          color: "var(--theme-shell-text-color, hsl(var(--foreground)))",
        }}
        className={cn(
          "flex h-full flex-col transition-all duration-300 ease-in-out border-r border-foreground/10",
          "fixed inset-y-0 left-0 z-50 w-[17rem] lg:static lg:z-auto lg:shrink-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]",
        )}
      >
        {/* Brand + mobile close */}
        <div className="flex h-[4.5rem] items-center justify-between gap-2 px-6 border-b border-foreground/5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center group"
            onClick={onCloseMobile}
          >
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
                Space Tech Solution
              </span>
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
            "flex-1 space-y-5 overflow-y-auto px-4 py-5",
            collapsed && "space-y-6 px-3 py-6",
          )}
        >
          {allSections.map((section) => (
            <div
              key={section.title}
              className={cn(
                "space-y-1.5 px-1",
                collapsed && "px-0",
              )}
            >
              {!collapsed && (
                <div className="flex items-center gap-2 px-2 pb-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {section.title}
                  </span>
                  <span className="h-px flex-1 bg-emerald-300/70 dark:bg-emerald-500/40" />
                </div>
              )}
              <div
                className={cn(
                  "space-y-1.5 rounded-xl border border-foreground/10 p-1.5",
                  collapsed && "space-y-2 p-2",
                )}
              >
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
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
                      className={cn(isCollapsedRail && "w-full")}
                    >
                      <LinkEl
                        {...linkProps}
                        onClick={onCloseMobile}
                        className={cn(
                          "group flex items-center rounded-xl border text-[14px] font-medium transition-all duration-200",
                          isCollapsedRail
                            ? "h-10 w-full justify-center gap-0 p-0"
                            : "gap-3 px-3 py-2.5",
                          isActive
                            ? "sidebar-active-item border-primary/20 bg-primary text-primary-foreground shadow-sm"
                            : "border-transparent bg-transparent text-[inherit] opacity-80 hover:opacity-100 hover:border-foreground/20 hover:bg-muted/70",
                        )}
                      >
                        {Icon &&
                          (isCollapsedRail ? (
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] shrink-0 transition-colors",
                                isActive
                                  ? "text-primary-foreground"
                                  : "text-[inherit] opacity-70 group-hover:opacity-100",
                              )}
                            />
                          ) : (
                            <Icon
                              className={cn(
                                "h-[15px] w-[15px] shrink-0 transition-colors",
                                isActive
                                  ? "text-primary-foreground"
                                  : "text-[inherit] opacity-70 group-hover:opacity-100",
                              )}
                            />
                          ))}
                        {!isCollapsedRail && (
                          <>
                            <span
                              className={cn(
                                "truncate flex-1",
                                isActive && "font-bold",
                              )}
                            >
                              {item.label}
                            </span>
                            {opensNewTab && (
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
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

        {/* Bottom user info section */}
        {!collapsed && (
          <div className="border-t border-foreground/5 px-4 py-3.5">
            <div className="px-1 py-1">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted/20 text-xs font-bold text-[inherit]">
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
                  <p className="text-sm font-semibold truncate text-[inherit]">
                    {userName}
                  </p>
                  <p className="text-[11px] font-medium opacity-70">
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
