"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouteLoading } from "@/components/providers/route-loading-provider";
import { getInitials, formatDateTime, cn, formatCnic } from "@/lib/utils";
import { LogOut, Menu, Bell, Search, ChevronLeft, ChevronRight, Sun, Moon, MessageSquare, ShoppingCart, AlertTriangle, Users, CalendarDays, Info } from "lucide-react";
import Image from "next/image";
import { ROLE_LABELS } from "@/lib/constants";
import type { Notification, UserRole } from "@/lib/types";

function formatEmploymentType(type: string | null | undefined): string | null {
  if (!type) return null;
  const labels: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    intern: "Intern",
  };
  return labels[type] || type;
}

function formatPaidThrough(method: string | null | undefined): string | null {
  if (!method) return null;
  const labels: Record<string, string> = {
    Bank: "Bank",
    Cash: "Cash",
    Cheque: "Cheque",
  };
  return labels[method] || method;
}

function ProfileField({ label, value, badge }: { label: string; value: string | null | undefined; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {badge && value ? (
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {value}
        </span>
      ) : (
        <span className={cn("text-sm font-medium", value ? "text-foreground" : "text-muted-foreground/50")}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

const NOTIFICATION_STYLES = {
  sale: { icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  chargeback: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
  customer: { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  leave: { icon: CalendarDays, color: "text-amber-500", bg: "bg-amber-500/10" },
  info: { icon: Info, color: "text-slate-500", bg: "bg-slate-500/10" },
};

interface HeaderProps {
  userName: string;
  role: UserRole;
  userAvatarUrl?: string | null;
  userId?: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export function Header({
  userName,
  role,
  userAvatarUrl,
  userId,
  collapsed,
  onToggleSidebar,
  isMobile = false,
}: HeaderProps) {
  const router = useRouter();
  const { startLoading } = useRouteLoading();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSignOut = async () => {
    startLoading();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const loadNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .neq("type", "chat")
          .order("created_at", { ascending: false })
          .limit(20);
        if (!error && data) setNotifications(data as Notification[]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !notificationsOpen) {
        const target = e.target as HTMLElement;
        const isInput =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          (target instanceof HTMLElement && target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notificationsOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    startLoading();
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  const toggleNotifications = () => {
    setNotificationsOpen((v) => !v);
  };

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    const supabase = createClient();
    setMarkingAllRead(true);
    const prev = notifications;
    setNotifications((curr) => curr.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) setNotifications(prev);
    setMarkingAllRead(false);
  };

  const openProfile = async () => {
    if (!userId) return;
    setProfileOpen(true);
    setLoadingProfile(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
      if (!error) setProfile(data);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeProfile = () => setProfileOpen(false);

  useEffect(() => {
    if (!notificationsOpen || isMobile) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationsPanelRef.current?.contains(target) ||
        notificationsTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [notificationsOpen, isMobile]);

  return (
    <>
    <header
      style={{
        backgroundColor: "var(--theme-shell-bg-color, hsl(var(--background)))",
        color: "var(--theme-shell-text-color, hsl(var(--foreground)))",
      }}
      className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center justify-between gap-3 border-b border-foreground/10 px-3 sm:px-4 lg:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg p-2 text-[inherit] opacity-70 hover:opacity-100 hover:bg-muted/20"
          onClick={onToggleSidebar}
          aria-label={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMobile ? (
            <Menu className="h-5 w-5" />
          ) : collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
          {!isMobile && (
            <span className="hidden text-xs font-medium text-[inherit] sm:inline">
              {collapsed ? "Expand" : "Collapse"}
            </span>
          )}
        </button>

        <form
          className="hidden max-w-xs flex-1 md:flex lg:max-w-sm"
          onSubmit={handleSearchSubmit}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[inherit] opacity-60" />
            <input
              ref={searchRef}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-md border border-foreground/20 bg-muted/20 pl-9 pr-3 text-sm text-[inherit] placeholder:text-[inherit] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-foreground/10 bg-background/20 px-1.5 py-0.5 text-[10px] font-medium text-[inherit] opacity-60 lg:inline-block">
              /
            </kbd>
          </div>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            startLoading();
            router.push("/chat");
          }}
          className="relative rounded-lg p-2 text-[inherit] opacity-70 hover:opacity-100 hover:bg-muted/20 sm:p-2.5"
          aria-label="Open chat"
        >
          <MessageSquare className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative rounded-lg p-2 text-[inherit] opacity-70 hover:opacity-100 hover:bg-muted/20 sm:p-2.5"
          aria-label="Toggle theme"
        >
          {mounted && (theme === "dark" ? (
            <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          ) : (
            <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          ))}
          {!mounted && <div className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
        </button>

        <div className="relative">
          <button
            ref={notificationsTriggerRef}
            type="button"
            onClick={toggleNotifications}
            className="relative rounded-lg p-2 text-[inherit] opacity-70 hover:opacity-100 hover:bg-muted/20 sm:p-2.5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <>
              {isMobile ? (
                <div className="fixed inset-0 z-50" onClick={() => setNotificationsOpen(false)}>
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <div
                    ref={notificationsPanelRef}
                    className="absolute left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-foreground/10 bg-card shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-foreground/5 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notifications
                      </span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            disabled={markingAllRead}
                            className="text-[11px] font-medium text-primary disabled:opacity-50"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-muted-foreground hover:bg-muted"
                          aria-label="Close notifications"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
                      ) : notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => {
                          const style = (NOTIFICATION_STYLES as any)[n.type] || NOTIFICATION_STYLES.info;
                          const Icon = style.icon;
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => markAsRead(n.id)}
                              className={cn(
                                "w-full border-b border-foreground/5 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/30",
                                !n.is_read && "bg-primary/[0.03]"
                              )}
                            >
                              <div className="flex gap-3">
                                <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.bg, style.color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[13px] font-semibold text-foreground">
                                      {n.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                      {formatDateTime(n.created_at)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                                    {n.body}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={notificationsPanelRef} className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-foreground/10 bg-card shadow-lg">
                  <div className="flex items-center justify-between border-b border-foreground/5 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notifications
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          disabled={markingAllRead}
                          className="text-[11px] font-medium text-primary disabled:opacity-50"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-muted-foreground hover:bg-muted"
                        aria-label="Close notifications"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => {
                        const style = (NOTIFICATION_STYLES as any)[n.type] || NOTIFICATION_STYLES.info;
                        const Icon = style.icon;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className={cn(
                              "w-full border-b border-foreground/5 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/30",
                              !n.is_read && "bg-primary/[0.03]"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.bg, style.color)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[13px] font-semibold text-foreground">
                                    {n.title}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {formatDateTime(n.created_at)}
                                  </span>
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                                  {n.body}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mx-0.5 h-7 w-px bg-foreground/10 sm:mx-1 sm:h-9" />

        <div className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/20 sm:gap-3 sm:px-2 sm:py-1.5" onClick={openProfile}>
          <div className="relative">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-xs font-bold text-[inherit] sm:h-9 sm:w-9">
              {userAvatarUrl ? (
                <Image
                  src={userAvatarUrl}
                  alt={userName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(userName)
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold leading-none text-[inherit]">{userName}</p>
            <p className="mt-1 text-[11px] font-medium text-[inherit] opacity-70">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign out"
          className="h-8 w-8 shrink-0 rounded-lg text-[inherit] opacity-70 hover:bg-destructive/10 hover:text-destructive hover:opacity-100 sm:h-9 sm:w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
    {profileOpen && (
      <div className="fixed inset-0 z-40" onClick={closeProfile}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col",
            "animate-[slide-in-from-right_0.2s_ease-out]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold">
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile?.full_name || userName} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profile?.full_name || userName)
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{profile?.full_name || userName}</p>
                <p className="text-[12px] text-muted-foreground">{ROLE_LABELS[(profile?.role || role) as UserRole] || role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeProfile}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Close profile"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loadingProfile ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading profile…</p>
            ) : (
              <div className="space-y-4">
                {/* Basic Info Card */}
                <details className="group rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-4" open>
                  <summary className="mb-3 flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      Basic Information
                    </span>
                    <span className="text-sm font-semibold normal-case text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="space-y-3">
                    <ProfileField label="Full Name" value={profile?.full_name || userName} />
                    <ProfileField label="Email" value={profile?.email} />
                    <ProfileField
                      label="Role"
                      value={ROLE_LABELS[(profile?.role || role) as UserRole] || role}
                      badge
                    />
                  </div>
                </details>

                {/* Work Info Card */}
                <details className="group rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                  <summary className="mb-3 flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Work Information
                    </span>
                    <span className="text-sm font-semibold normal-case text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="space-y-3">
                    <ProfileField label="Department" value={profile?.department} />
                    <ProfileField label="Job Position" value={profile?.job_position} />
                    <ProfileField label="Company" value={profile?.company_name} />
                    <ProfileField label="Category" value={profile?.category} badge />
                    <ProfileField
                      label="Employment Type"
                      value={formatEmploymentType(profile?.employment_type)}
                      badge
                    />
                    <ProfileField
                      label="Date of Joining"
                      value={profile?.joining_date ? new Date(profile.joining_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null}
                    />
                    <ProfileField label="Father Name" value={profile?.father_name} />
                    <ProfileField label="CNIC" value={formatCnic(profile?.cnic)} />
                    <ProfileField label="Address" value={profile?.address} />
                  </div>
                </details>

                {/* Education Card */}
                <details className="group rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                  <summary className="mb-3 flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                      </span>
                      Education
                    </span>
                    <span className="text-sm font-semibold normal-case text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="space-y-3">
                    <ProfileField label="Degree" value={profile?.education_degree} />
                  </div>
                </details>

                {/* Payroll & Payment Card */}
                <details className="group rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                  <summary className="mb-3 flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.761 0-5 1.343-5 3s2.239 3 5 3 5-1.343 5-3-2.239-3-5-3zm0 0V5m0 9v5m-7-8h14" />
                        </svg>
                      </span>
                      Payroll & Payment
                    </span>
                    <span className="text-sm font-semibold normal-case text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="space-y-3">
                    <ProfileField label="Pay Days" value={profile?.pay_days ? String(profile.pay_days) : null} />
                    <ProfileField label="Pay Rate" value={profile?.pay_rate ? String(profile.pay_rate) : null} />
                    <ProfileField label="Gross Pay" value={profile?.gross_pay ? String(profile.gross_pay) : null} />
                    <ProfileField label="Basic Salary" value={profile?.basic_salary ? String(profile.basic_salary) : null} />
                    <ProfileField label="Paid Through" value={formatPaidThrough(profile?.paid_through)} badge />
                    {profile?.paid_through !== "Cash" && (
                      <>
                        <ProfileField
                          label={profile?.paid_through === "Cheque" ? "Cheque Number" : "Account Number"}
                          value={profile?.bank_account_no}
                        />
                        <ProfileField
                          label={profile?.paid_through === "Cheque" ? "Cheque Bank" : "Bank Branch"}
                          value={profile?.bank_branch}
                        />
                      </>
                    )}
                  </div>
                </details>

                {/* Employee ID */}
                {profile?.employee_id && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Employee ID</span>
                    <p className="mt-1 font-mono text-sm font-bold text-foreground">{profile.employee_id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
