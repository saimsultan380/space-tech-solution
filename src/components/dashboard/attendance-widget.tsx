"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { checkIn, checkOut } from "@/lib/actions/attendance";
import { formatDateTime } from "@/lib/utils";
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";

interface AttendanceWidgetProps {
  todayAttendance: {
    id: string;
    check_in: string;
    check_out: string | null;
  } | null;
}

export function AttendanceWidget({ todayAttendance }: AttendanceWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasCheckedIn = !!todayAttendance;
  const hasCheckedOut = !!todayAttendance?.check_out;

  const handleCheckIn = async () => {
    setLoading(true);
    setError("");
    try {
      await checkIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check in");
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError("");
    try {
      await checkOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check out");
    }
    setLoading(false);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-medium text-muted-foreground">Today&apos;s Attendance</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg">
          <Clock className="h-5 w-5" />
        </div>
      </div>

      {hasCheckedIn && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-success/5 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Check In</span>
            <span className="text-xs font-semibold text-success">
              {formatDateTime(todayAttendance.check_in)}
            </span>
          </div>
          {hasCheckedOut && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Check Out</span>
              <span className="text-xs font-semibold text-primary">
                {formatDateTime(todayAttendance.check_out!)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {!hasCheckedIn && (
        <Button size="sm" onClick={handleCheckIn} disabled={loading} className="w-full h-10 rounded-xl shadow-sm shadow-primary/20 font-semibold">
          {loading ? <Spinner /> : <><LogIn className="h-4 w-4" /> Check In</>}
        </Button>
      )}

      {hasCheckedIn && !hasCheckedOut && (
        <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={loading} className="w-full h-10 rounded-xl font-semibold">
          {loading ? <Spinner /> : <><LogOut className="h-4 w-4" /> Check Out</>}
        </Button>
      )}

      {hasCheckedOut && (
        <div className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" />
          Shift completed
        </div>
      )}
    </div>
  );
}
