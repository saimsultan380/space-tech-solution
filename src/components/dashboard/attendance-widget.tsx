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
    <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#111827]">Today&apos;s Attendance</p>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF3FF]">
          <Clock className="h-5 w-5 text-[#3B6EF8]" />
        </div>
      </div>

      {hasCheckedIn && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between rounded-md bg-[#F0FDF4] px-3 py-2">
            <span className="text-xs font-medium text-[#6B7280]">Check In</span>
            <span className="text-xs font-semibold text-[#16A34A]">
              {formatDateTime(todayAttendance.check_in)}
            </span>
          </div>
          {hasCheckedOut && (
            <div className="flex items-center justify-between rounded-md bg-[#EEF3FF] px-3 py-2">
              <span className="text-xs font-medium text-[#6B7280]">Check Out</span>
              <span className="text-xs font-semibold text-[#3B6EF8]">
                {formatDateTime(todayAttendance.check_out!)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs text-[#EF4444]">
          <div className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
          {error}
        </div>
      )}

      {!hasCheckedIn && (
        <Button
          size="sm"
          onClick={handleCheckIn}
          disabled={loading}
          className="h-10 w-full rounded-lg bg-[#3B6EF8] font-semibold text-white hover:bg-[#2F5DE0]"
        >
          {loading ? <Spinner /> : <><LogIn className="h-4 w-4" /> Check In</>}
        </Button>
      )}

      {hasCheckedIn && !hasCheckedOut && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCheckOut}
          disabled={loading}
          className="h-10 w-full rounded-lg border-[#E5E7EB] font-semibold text-[#374151] hover:bg-[#F8F9FB]"
        >
          {loading ? <Spinner /> : <><LogOut className="h-4 w-4" /> Check Out</>}
        </Button>
      )}

      {hasCheckedOut && (
        <div className="flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
          <CheckCircle2 className="h-4 w-4" />
          Shift completed
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF]">
        <Clock className="h-3.5 w-3.5" />
        Shift window: 09:00 AM - 06:00 PM
      </p>
    </div>
  );
}
