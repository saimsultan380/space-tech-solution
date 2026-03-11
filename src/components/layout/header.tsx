"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getInitials, formatDateTime } from "@/lib/utils";
import { LogOut, Menu, Bell, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Notification } from "@/lib/types";

interface HeaderProps {
  userName: string;
  userAvatarUrl?: string | null;
  userId?: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export function Header({
  userName,
  userAvatarUrl,
  userId,
  collapsed,
  onToggleSidebar,
  isMobile = false,
}: HeaderProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement | null>(null);
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
          (target as any)?.isContentEditable;
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
    <header className="sticky top-0 z-30 flex h-14 min-h-[3.5rem] shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 hover:bg-muted transition-colors flex items-center gap-1"
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

        {/* Search bar - hidden on small screens */}
        <form
          className="hidden md:flex flex-1 max-w-xs lg:max-w-sm"
          onSubmit={handleSearchSubmit}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              ref={searchRef}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border-0 bg-muted/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all lg:h-10 lg:rounded-xl lg:pr-4"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
              /
            </kbd>
          </div>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all sm:rounded-xl sm:p-2.5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-3 min-w-[0.9rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-2 ring-card sm:right-2 sm:top-2">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-[4px] border border-border/60 bg-card shadow-lg z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-[11px] text-primary font-medium">
                      {unreadCount} new
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:bg-muted flex items-center justify-center text-xs"
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
                      className={`w-full px-3 py-2.5 text-left text-xs border-b border-border/40 last:border-b-0 hover:bg-muted/60 ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground text-[12px] truncate">
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

        <div className="mx-0.5 h-6 w-px bg-border/60 sm:mx-1 sm:h-8" />

        {/* User avatar + info */}
        <div className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors cursor-pointer sm:gap-3 sm:rounded-xl sm:px-2 sm:py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground shadow-sm sm:h-9 sm:w-9 overflow-hidden">
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatarUrl}
                alt={userName}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(userName)
            )}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold leading-none truncate">{userName}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Online</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign out"
          className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:rounded-xl h-8 w-8 sm:h-9 sm:w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
