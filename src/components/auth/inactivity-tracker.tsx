"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";

interface InactivityTrackerProps {
  timeoutMs?: number; // Total inactivity time before logout
  warningMs?: number; // Time to show warning before logout
}

export function InactivityTracker({
  timeoutMs = 30 * 60 * 1000, // 30 minutes default
  warningMs = 60 * 1000, // 1 minute warning
}: InactivityTrackerProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningMs / 1000));
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);

    // Set main timeout timer (to show warning)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.floor(warningMs / 1000));
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

    // Set absolute timeout timer (to logout)
    timerRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, logout]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    // Initialize timers
    resetTimers();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimers, showWarning]);

  const handleStayLoggedIn = () => {
    resetTimers();
  };

  if (!showWarning) return null;

  return (
    <Dialog open={showWarning} onClose={handleStayLoggedIn} className="sm:max-w-[420px]">
      <DialogHeader className="space-y-3 text-center sm:text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <Clock className="h-6 w-6" />
        </div>
        <DialogTitle className="text-center text-xl font-bold">Inactivity Warning</DialogTitle>
        <DialogDescription className="text-center text-muted-foreground">
          You have been inactive for a while. For your security, you will be automatically logged out in:
          <div className="mt-4 text-3xl font-black text-foreground tabular-nums">
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
        <Button onClick={handleStayLoggedIn} className="w-full rounded-md font-bold">
          Stay Logged In
        </Button>
        <Button variant="ghost" onClick={logout} className="w-full rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout Now
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
