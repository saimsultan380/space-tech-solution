"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BouncingDots } from "@/components/ui/bouncing-dots";
import { cn } from "@/lib/utils";

type RouteLoadingContextValue = {
  startLoading: () => void;
  stopLoading: () => void;
  isLoading: boolean;
};

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

export function useRouteLoading() {
  const context = useContext(RouteLoadingContext);
  if (!context) {
    throw new Error("useRouteLoading must be used within RouteLoadingProvider");
  }
  return context;
}

export function RouteLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [locationKey, setLocationKey] = useState(pathname);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_VISIBLE_MS = 1000;
  const ROUTE_SETTLE_BUFFER_MS = 300;

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopLoading = useCallback(() => {
    clearPendingTimeout();
    const startedAt = startedAtRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed) + ROUTE_SETTLE_BUFFER_MS;

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      startedAtRef.current = null;
    }, waitMs);
  }, [clearPendingTimeout]);

  const startLoading = useCallback(() => {
    clearPendingTimeout();
    startedAtRef.current = Date.now();
    setIsLoading(true);

    // Safety timeout: avoid stuck loader in edge cases
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      startedAtRef.current = null;
    }, 10000);
  }, [clearPendingTimeout]);

  useEffect(() => {
    setLocationKey(`${pathname}${window.location.search}`);
  }, [pathname]);

  useEffect(() => {
    const updateLocationKey = () => {
      setLocationKey(`${window.location.pathname}${window.location.search}`);
    };

    const patchHistoryMethod = (method: "pushState" | "replaceState") => {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args as [data: unknown, unused: string, url?: string | URL | null]);
        window.dispatchEvent(new Event("locationchange"));
        return result;
      };
      return () => {
        history[method] = original;
      };
    };

    const restorePushState = patchHistoryMethod("pushState");
    const restoreReplaceState = patchHistoryMethod("replaceState");

    window.addEventListener("popstate", updateLocationKey);
    window.addEventListener("locationchange", updateLocationKey);

    return () => {
      restorePushState();
      restoreReplaceState();
      window.removeEventListener("popstate", updateLocationKey);
      window.removeEventListener("locationchange", updateLocationKey);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      stopLoading();
    }
  }, [locationKey, isLoading, stopLoading]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      try {
        const destination = new URL(anchor.href, window.location.origin);
        const current = new URL(window.location.href);
        const isSamePage = destination.pathname === current.pathname && destination.search === current.search;
        const isSameOrigin = destination.origin === current.origin;

        if (!isSameOrigin || isSamePage) return;
        startLoading();
      } catch {
        // Ignore malformed URLs.
      }
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [startLoading]);

  useEffect(() => {
    return () => clearPendingTimeout();
  }, [clearPendingTimeout]);

  const value = useMemo(
    () => ({
      startLoading,
      stopLoading,
      isLoading,
    }),
    [startLoading, stopLoading, isLoading]
  );

  return (
    <RouteLoadingContext.Provider value={value}>
      {children}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-background/55 backdrop-blur-[1px] transition-opacity duration-200",
          isLoading ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isLoading}
      >
        <BouncingDots message="Loading..." />
      </div>
    </RouteLoadingContext.Provider>
  );
}

// Re-export Link so future components can be swapped easily if needed.
export { Link as RouteLoadingLink };
