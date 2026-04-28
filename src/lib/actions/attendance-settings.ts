"use server";

import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttendanceSettings } from "@/lib/types";

function format12Hour(time24: string) {
  const [h = "0", m = "00"] = time24.split(":");
  const hour = Number(h);
  const minutes = m.slice(0, 2);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
}

function parse12Hour(time12: string) {
  const value = time12.trim().toUpperCase();
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) throw new Error(`Invalid time format: ${time12}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time value: ${time12}`);
  }
  let hour24 = hour % 12;
  if (suffix === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function toMinutes(time24: string) {
  const parts = time24.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

export const getAttendanceSettings = unstable_cache(
  async (): Promise<
    AttendanceSettings & {
      shift_start_12h: string;
      late_after_12h: string;
      shift_end_12h: string;
      checkout_latest_12h: string;
    }
  > => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("attendance_settings")
      .select("id, shift_start_time, late_after_time, shift_end_time, checkout_latest_time, checkout_grace_minutes, allow_early_checkout, early_checkout_minutes, notify_after_minutes, auto_leave_after_minutes, auto_leave_enabled, auto_leave_type, created_at, updated_at")
      .eq("id", 1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    const settings = data || {
      id: 1,
      shift_start_time: "09:00:00",
      late_after_time: "09:15:00",
      shift_end_time: "18:00:00",
      checkout_latest_time: "23:00:00",
      checkout_grace_minutes: 0,
      allow_early_checkout: false,
      early_checkout_minutes: 0,
      notify_after_minutes: 60,
      auto_leave_after_minutes: 240,
      auto_leave_enabled: true,
      auto_leave_type: "casual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      ...settings,
      shift_start_12h: format12Hour(settings.shift_start_time),
      late_after_12h: format12Hour(settings.late_after_time),
      shift_end_12h: format12Hour(settings.shift_end_time),
      checkout_latest_12h: format12Hour(settings.checkout_latest_time),
    };
  },
  ["attendance-settings"],
  { revalidate: 3600, tags: ["settings", "attendance-settings"] }
);

export async function updateAttendanceSettings(input: {
  // Prefer 24h picker values (HH:MM). 12h fields are kept for backward compatibility.
  shift_start_time?: string;
  late_after_time?: string;
  shift_end_time?: string;
  checkout_latest_time?: string;
  shift_start_12h?: string;
  late_after_12h?: string;
  shift_end_12h?: string;
  checkout_latest_12h?: string;
  notify_after_minutes?: number;
  auto_leave_after_minutes?: number;
  auto_leave_enabled?: boolean;
  auto_leave_type?: string;
  checkout_grace_minutes?: number;
  allow_early_checkout?: boolean;
  early_checkout_minutes?: number;
}) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  function normalizeTime(value: string) {
    const trimmed = value.trim();
    // Accept HH:MM and convert to HH:MM:SS
    const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) throw new Error(`Invalid time format: ${value}`);
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3] ?? "0");
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) {
      throw new Error(`Invalid time value: ${value}`);
    }
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  const shiftStart =
    input.shift_start_time !== undefined
      ? normalizeTime(input.shift_start_time)
      : parse12Hour(input.shift_start_12h ?? "");
  const lateAfter =
    input.late_after_time !== undefined
      ? normalizeTime(input.late_after_time)
      : parse12Hour(input.late_after_12h ?? "");
  const shiftEnd =
    input.shift_end_time !== undefined
      ? normalizeTime(input.shift_end_time)
      : parse12Hour(input.shift_end_12h ?? "");
  const checkoutLatest =
    input.checkout_latest_time !== undefined
      ? normalizeTime(input.checkout_latest_time)
      : parse12Hour(input.checkout_latest_12h ?? "");

  const checkoutGraceMinutes = Math.max(0, input.checkout_grace_minutes ?? 0);
  const allowEarlyCheckout = input.allow_early_checkout ?? false;
  const earlyCheckoutMinutes = Math.max(0, input.early_checkout_minutes ?? 0);

  // If grace minutes is provided (> 0), compute checkout_latest_time from shift_end_time.
  // This avoids admins having to manually pick a "Latest Checkout" clock time.
  let effectiveCheckoutLatest = checkoutLatest;
  if (checkoutGraceMinutes > 0) {
    const end = toMinutes(shiftEnd);
    const latest = Math.min(24 * 60 - 1, end + checkoutGraceMinutes);
    const hh = Math.floor(latest / 60);
    const mm = latest % 60;
    effectiveCheckoutLatest = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  }

  if (toMinutes(lateAfter) < toMinutes(shiftStart)) {
    throw new Error("Late after time cannot be before shift start");
  }
  if (toMinutes(shiftEnd) <= toMinutes(shiftStart)) {
    throw new Error("Shift end must be after shift start");
  }
  if (toMinutes(effectiveCheckoutLatest) < toMinutes(shiftEnd)) {
    throw new Error("Latest checkout cannot be before shift end");
  }
  if (earlyCheckoutMinutes > 24 * 60) {
    throw new Error("Early checkout minutes is too large");
  }

  const updateData: Record<string, unknown> = {
    id: 1,
    shift_start_time: shiftStart,
    late_after_time: lateAfter,
    shift_end_time: shiftEnd,
    checkout_latest_time: effectiveCheckoutLatest,
    checkout_grace_minutes: checkoutGraceMinutes,
    allow_early_checkout: allowEarlyCheckout,
    early_checkout_minutes: earlyCheckoutMinutes,
  };

  if (input.notify_after_minutes !== undefined) {
    updateData.notify_after_minutes = input.notify_after_minutes;
  }
  if (input.auto_leave_after_minutes !== undefined) {
    updateData.auto_leave_after_minutes = input.auto_leave_after_minutes;
  }
  if (input.auto_leave_enabled !== undefined) {
    updateData.auto_leave_enabled = input.auto_leave_enabled;
  }
  if (input.auto_leave_type !== undefined) {
    updateData.auto_leave_type = input.auto_leave_type;
  }

  const { error } = await supabase
    .from("attendance_settings")
    .upsert(updateData, { onConflict: "id" });

  if (error) throw new Error(error.message);

  (revalidateTag as any)("attendance-settings");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
}
