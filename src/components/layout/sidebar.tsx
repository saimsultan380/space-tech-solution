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
      hrefs: ["/dashboard", "/dashboard/sales"],
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
  const baseItems = NAV_ITEMS[role] || [];
  const legacyModuleAliases: Record<string, string[]> = {
    "/dashboard/call-logs-responses": ["/dashboard/customers"],
  };
  const navItems =
    role !== "super_admin" && allowedModules && allowedModules.length > 0
      ? baseItems.filter((item) =>
          allowedModules.includes(item.href) ||
          (legacyModuleAliases[item.href] || []).some((legacyHref) => allowedModules.includes(legacyHref))
        )
      : baseItems;
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
          "flex h-full flex-col bg-gradient-to-b from-white to-[#F7FAFF] text-[#4A587A] transition-all duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-50 w-[17rem] lg:static lg:z-auto lg:shrink-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",  
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]"
        )}
      >
      {/* Brand + mobile close */}
      <div className="flex h-[4.5rem] items-center justify-between gap-2 px-3.5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 group" onClick={onCloseMobile}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent shadow-[0_8px_20px_rgba(59,110,248,0.2)] transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 text-primary drop-shadow-[0_2px_4px_rgba(59,110,248,0.35)]" />
          </div>
          {(!collapsed || isMobileOpen) && (
            <div className="min-w-0">
              <span className="text-[15px] font-bold tracking-tight text-[#111827]">Space Tech Solution</span>
              <span className="ml-1.5 inline-flex items-center rounded-md border border-[#DDE7FF] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
                v2
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F4F5F7] transition-colors lg:hidden"
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
              "space-y-1.5 rounded-2xl",
              (!collapsed || isMobileOpen) && "border border-[#EEF3FF] bg-white/70 px-2 py-2.5 shadow-[0_6px_20px_rgba(59,110,248,0.08)]"
            )}
          >
            {(!collapsed || isMobileOpen) && (
              <div className="flex items-center gap-2 px-2 pb-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B98B7]">
                  {section.title}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#D9E5FF] to-transparent" />
              </div>
            )}
            {section.items.map((item) => {
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
                      ? "bg-gradient-to-r from-primary to-[#2B62FF] text-primary-foreground shadow-[0_10px_18px_rgba(43,98,255,0.32)]"
                      : "text-[#4A587A] hover:bg-[#EEF4FF] hover:text-[#20315A]",
                    (collapsed && !isMobileOpen) && "justify-center px-2"
                  )}
                >
                  {Icon && (
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200",
                        isActive 
                          ? "bg-white/20 border-white/40 shadow-inner" 
                          : "bg-white border-[#3B6EF8]/40 shadow-sm group-hover:bg-white group-hover:border-primary/60"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[16px] w-[16px] transition-transform duration-200 group-hover:scale-110",
                          isActive ? "text-primary-foreground" : "text-[#64749A] group-hover:text-[#2B4C9B]"
                        )}
                      />
                    </div>
                  )}
                  {(!collapsed || isMobileOpen) && (
                    <span className={cn("truncate", isActive && "font-semibold tracking-[0.01em]")}>{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user info section */}
      {(!collapsed || isMobileOpen) && (
        <div className="p-4">
          <div className="rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-[#111827] shadow-sm overflow-hidden">
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
                <p className="text-sm font-semibold truncate text-[#111827]">{userName}</p>
                <p className="text-[11px] font-medium text-[#6B7280]">
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
