"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { checkIn, checkOut } from "@/lib/actions/attendance";
import { formatDateTime } from "@/lib/utils";
import { Clock, LogIn, LogOut, CheckCircle2 } from "@/components/ui/icons";

interface AttendanceWidgetProps {
  todayAttendance: {
    id: string;
    check_in: string;
    check_out: string | null;
  } | null;
  attendanceSettings?: {
    shift_start_12h: string;
    shift_end_12h: string;
    checkout_latest_12h: string;
    shift_end_time: string;
    checkout_latest_time: string;
    checkout_grace_minutes: number;
    allow_early_checkout: boolean;
    early_checkout_minutes: number;
  };
}

export function AttendanceWidget({ todayAttendance, attendanceSettings }: AttendanceWidgetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  type AttendanceState = { id: string; check_in: string; check_out: string | null } | null;
  type AttendanceAction = { type: "check-in" | "check-out"; time: string };

  const [optimisticAttendance, setOptimisticAttendance] = useOptimistic(
    todayAttendance,
    (state: AttendanceState, action: AttendanceAction) => {
      if (action.type === "check-in") {
        return { id: "temp", check_in: action.time, check_out: null };
      }
      if (action.type === "check-out") {
        return state ? { ...state, check_out: action.time } : state;
      }
      return state;
    }
  );

  const hasCheckedIn = !!optimisticAttendance;
  const hasCheckedOut = !!optimisticAttendance?.check_out;

  const handleCheckIn = () => {
    startTransition(async () => {
      setError("");
      const now = new Date().toISOString();
      setOptimisticAttendance({ type: "check-in", time: now });
      try {
        const res = await checkIn();
        if (!res.ok) setError(res.error ?? "Failed to check in");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check in");
      }
    });
  };

  const handleCheckOut = () => {
    startTransition(async () => {
      setError("");
      const now = new Date().toISOString();
      setOptimisticAttendance({ type: "check-out", time: now });
      try {
        const res = await checkOut();
        if (!res.ok) setError(res.error ?? "Failed to check out");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check out");
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-indigo-500/[0.08] via-card to-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Today&apos;s Attendance</p>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
      </div>

      {hasCheckedIn && optimisticAttendance && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Check In</span>
            <span className="text-xs font-semibold text-success">
              {formatDateTime(optimisticAttendance.check_in)}
            </span>
          </div>
          {hasCheckedOut && (
            <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Check Out</span>
              <span className="text-xs font-semibold text-primary">
                {formatDateTime(optimisticAttendance.check_out!)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {!hasCheckedIn && (
        <Button
          size="sm"
          onClick={handleCheckIn}
          disabled={isPending}
          className="h-10 w-full rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {isPending ? <Spinner /> : <><LogIn className="h-4 w-4 mr-2" /> Check In</>}
        </Button>
      )}

      {hasCheckedIn && !hasCheckedOut && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCheckOut}
          disabled={isPending}
          className="h-10 w-full rounded-lg border-primary text-primary font-semibold hover:bg-primary/10 hover:text-primary"
        >
          {isPending ? <Spinner /> : <><LogOut className="h-4 w-4 mr-2" /> Check Out</>}
        </Button>
      )}

      {hasCheckedOut && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-success/10 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" />
          Shift Completed
        </div>
      )}

      {attendanceSettings && (
        <div className="mt-4 space-y-1 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Shift: {attendanceSettings.shift_start_12h} - {attendanceSettings.shift_end_12h}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              Checkout window: {attendanceSettings.allow_early_checkout && attendanceSettings.early_checkout_minutes > 0
                ? `${attendanceSettings.early_checkout_minutes} min before shift end`
                : attendanceSettings.shift_end_12h} - {attendanceSettings.checkout_latest_12h}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
