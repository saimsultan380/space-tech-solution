"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getInitials, formatDateTime } from "@/lib/utils";
import { LogOut, Menu, Bell, Search, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import type { Notification, UserRole } from "@/lib/types";

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoadingNotifications(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!error && data) {
          setNotifications(data as Notification[]);
        }
      } finally {
        setLoadingNotifications(false);
      }
    };
    load();
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
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  const toggleNotifications = () => {
    setNotificationsOpen((v) => !v);
  };

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              {collapsed ? "Expand" : "Collapse"}
            </span>
          )}
        </button>

        <form
          className="hidden max-w-xs flex-1 md:flex lg:max-w-sm"
          onSubmit={handleSearchSubmit}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-muted/30 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
              /
            </kbd>
          </div>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:p-2.5"
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
            type="button"
            onClick={toggleNotifications}
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:p-2.5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-medium text-primary">
                      {unreadCount} new
                    </span>
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
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Loading...
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      className={`w-full border-b border-border/50 px-3 py-2.5 text-left text-xs last:border-b-0 hover:bg-muted/30 ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] font-semibold text-foreground">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.body}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mx-0.5 h-7 w-px bg-border sm:mx-1 sm:h-9" />

        <div className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/50 sm:gap-3 sm:px-2 sm:py-1.5">
          <div className="relative">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-foreground sm:h-9 sm:w-9">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(userName)
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold leading-none text-foreground">{userName}</p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign out"
          className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
