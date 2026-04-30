"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/loading";
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
  const showLoaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (showLoaderTimeoutRef.current) {
      clearTimeout(showLoaderTimeoutRef.current);
      showLoaderTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const stopLoading = useCallback(() => {
    clearPendingTimeout();
    setIsLoading(false);
  }, [clearPendingTimeout]);

  const startLoading = useCallback(() => {
    clearPendingTimeout();
    
    // Show loader immediately for instant feedback
    setIsLoading(true);

    // Safety timeout: avoid stuck loader in edge cases
    safetyTimeoutRef.current = setTimeout(() => {
      stopLoading();
    }, 8000); // Reduced from 10s to 8s
  }, [clearPendingTimeout, stopLoading]);

  useEffect(() => {
    // Defer update to avoid "useInsertionEffect must not schedule updates" in React 19
    const timer = setTimeout(() => {
      setLocationKey(`${pathname}${window.location.search}`);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const updateLocationKey = () => {
      // Defer update to avoid "useInsertionEffect must not schedule updates" in React 19
      setTimeout(() => {
        setLocationKey(`${window.location.pathname}${window.location.search}`);
      }, 0);
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
          "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-gradient-to-r from-primary via-primary/60 to-primary transition-all duration-200",
          isLoading ? "opacity-100 animate-pulse" : "opacity-0"
        )}
        aria-hidden={!isLoading}
      >
        <div className="h-full w-full bg-primary animate-[shimmer_1s_ease-in-out_infinite]" 
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1s ease-in-out infinite'
          }}
        />
      </div>
    </RouteLoadingContext.Provider>
  );
}

// Re-export Link so future components can be swapped easily if needed.
export { Link as RouteLoadingLink };
