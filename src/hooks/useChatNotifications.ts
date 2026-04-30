"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationPermission = "default" | "granted" | "denied";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChatNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [muted, setMuted] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const originalTitleRef = useRef<string>("");
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Persist original page title
    originalTitleRef.current = document.title;

    // Load mute preference
    try {
      const saved = localStorage.getItem("chat_notifications_muted");
      if (saved === "true") setMuted(true);
    } catch {}

    // Read current browser permission
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission as NotificationPermission);
    }

    return () => {
      // Restore title on unmount
      document.title = originalTitleRef.current;
    };
  }, []);

  // ── Tab title ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) New Message${totalUnread > 1 ? "s" : ""} — Space Tech`;
    } else {
      document.title = originalTitleRef.current || "Space Tech Solution";
    }
  }, [totalUnread]);

  // Reset unread when tab becomes visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setTotalUnread(0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // ── Permission request ────────────────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setPermission("granted");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
  }, []);

  // ── Sound (Web Audio API — no file needed) ────────────────────────────────

  const playSound = useCallback(() => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      // Create a short, subtle "ding" — two oscillators for a pleasant tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1108, ctx.currentTime); // C#6

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not available — silently ignore
    }
  }, [muted]);

  // ── Browser notification ──────────────────────────────────────────────────

  const showBrowserNotification = useCallback((
    title: string,
    body: string,
    icon?: string | null,
    onClick?: () => void,
  ) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return; // Don't show if tab is active

    try {
      const notif = new Notification(title, {
        body,
        icon: icon ?? "/space-tech-logo.png",
        badge: "/space-tech-logo.png",
        tag: "chat-message",
        silent: true,
      });

      notif.onclick = () => {
        window.focus();
        onClick?.();
        notif.close();
      };

      // Auto-close after 5s
      setTimeout(() => notif.close(), 5000);
    } catch {
      // Notification API not available
    }
  }, []);

  // ── Main trigger — call this when a new message arrives ──────────────────

  const notify = useCallback((opts: {
    senderName: string;
    channelName: string;
    content: string;
    isDm: boolean;
    senderAvatar?: string | null;
    onClick?: () => void;
  }) => {
    const { senderName, channelName, content, isDm, senderAvatar, onClick } = opts;

    // Increment unread badge
    setTotalUnread((n) => n + 1);

    // Play sound
    playSound();

    // Browser notification
    const title = isDm ? senderName : `#${channelName}`;
    const body = isDm ? content : `${senderName}: ${content}`;
    showBrowserNotification(title, body, senderAvatar, onClick);
  }, [playSound, showBrowserNotification]);

  // ── Mute toggle ───────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem("chat_notifications_muted", String(next)); } catch {}
      return next;
    });
  }, []);

  const clearUnread = useCallback(() => setTotalUnread(0), []);

  return {
    permission,
    muted,
    totalUnread,
    requestPermission,
    notify,
    toggleMute,
    clearUnread,
    playSound,
  };
}
