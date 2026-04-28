"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

interface AttendanceSettings {
  shift_start_time: string;
  late_after_time: string;
  shift_end_time: string;
  checkout_latest_time: string;
  checkout_grace_minutes: number;
  allow_early_checkout: boolean;
  early_checkout_minutes: number;
  notify_after_minutes: number;
  auto_leave_after_minutes: number;
  auto_leave_enabled: boolean;
  auto_leave_type: string;
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

function toMinutes(time24: string): number {
  const parts = time24.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeForDisplay(time24: string): string {
  const [h = "0", m = "00"] = time24.split(":");
  const hour = Number(h);
  const minutes = m.slice(0, 2);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

async function getAttendanceSettingsAdmin(): Promise<AttendanceSettings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("shift_start_time, late_after_time, shift_end_time, checkout_latest_time, checkout_grace_minutes, allow_early_checkout, early_checkout_minutes, notify_after_minutes, auto_leave_after_minutes, auto_leave_enabled, auto_leave_type")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data || {
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
  };
}

function getAppTimeZone() {
  return process.env.APP_TIMEZONE || process.env.TZ || "";
}

function getNowInTimeZone() {
  const tz = getAppTimeZone();
  try {
    if (!tz) {
      const now = new Date();
      return {
        minutes: now.getHours() * 60 + now.getMinutes(),
        dateISO: now.toISOString().split("T")[0],
      };
    }

    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));
    return {
      minutes: hour * 60 + minute,
      dateISO: `${year}-${month}-${day}`,
    };
  } catch {
    const now = new Date();
    return {
      minutes: now.getHours() * 60 + now.getMinutes(),
      dateISO: now.toISOString().split("T")[0],
    };
  }
}

export async function processAttendanceNotifications(): Promise<{
  notificationsSent: number;
  leavesCreated: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const settings = await getAttendanceSettingsAdmin();
  const { dateISO: today, minutes: currentMinutes } = getNowInTimeZone();
  const lateAfterMinutes = toMinutes(settings.late_after_time);
  
  const result = {
    notificationsSent: 0,
    leavesCreated: 0,
    errors: [] as string[],
  };

  const { data: activeUsers, error: usersError } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("is_active", true);

  if (usersError) {
    result.errors.push(`Failed to fetch users: ${usersError.message}`);
    return result;
  }

  if (!activeUsers || activeUsers.length === 0) {
    return result;
  }

  const { data: todayAttendance, error: attendanceError } = await supabase
    .from("attendance")
    .select("user_id")
    .eq("date", today);

  if (attendanceError) {
    result.errors.push(`Failed to fetch attendance: ${attendanceError.message}`);
    return result;
  }

  const checkedInUserIds = new Set((todayAttendance || []).map((a) => a.user_id));

  const { data: todayLeaves, error: leavesError } = await supabase
    .from("leaves")
    .select("user_id, status")
    .lte("start_date", today)
    .gte("end_date", today);

  if (leavesError) {
    result.errors.push(`Failed to fetch leaves: ${leavesError.message}`);
    return result;
  }

  const usersOnLeave = new Set(
    (todayLeaves || [])
      .filter((l) => l.status === "approved" || l.status === "pending")
      .map((l) => l.user_id)
  );

  const { data: sentNotifications, error: notifError } = await supabase
    .from("attendance_notifications")
    .select("user_id, notification_type")
    .eq("date", today);

  if (notifError) {
    result.errors.push(`Failed to fetch notification records: ${notifError.message}`);
    return result;
  }

  const sentReminderUserIds = new Set(
    (sentNotifications || [])
      .filter((n) => n.notification_type === "reminder")
      .map((n) => n.user_id)
  );
  const sentAutoLeaveUserIds = new Set(
    (sentNotifications || [])
      .filter((n) => n.notification_type === "auto_leave")
      .map((n) => n.user_id)
  );

  const absentUsers = (activeUsers as User[]).filter(
    (u) => !checkedInUserIds.has(u.id) && !usersOnLeave.has(u.id)
  );

  const notifyThreshold = lateAfterMinutes + settings.notify_after_minutes;
  const autoLeaveThreshold = lateAfterMinutes + settings.auto_leave_after_minutes;

  const formattedDate = formatDateForDisplay(today);
  const checkInDeadline = formatTimeForDisplay(settings.checkout_latest_time);

  for (const user of absentUsers) {
    if (currentMinutes >= notifyThreshold && !sentReminderUserIds.has(user.id)) {
      try {
        await createNotification({
          user_id: user.id,
          title: "Attendance Reminder",
          body: `You haven't checked in for ${formattedDate}. Please check in before ${checkInDeadline} or your attendance will be marked as absent.`,
          type: "attendance",
        });

        await supabase.from("attendance_notifications").insert({
          user_id: user.id,
          date: today,
          notification_type: "reminder",
        });

        result.notificationsSent++;
      } catch (err) {
        result.errors.push(`Failed to notify ${user.full_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (
      settings.auto_leave_enabled &&
      currentMinutes >= autoLeaveThreshold &&
      !sentAutoLeaveUserIds.has(user.id)
    ) {
      try {
        const { error: leaveError } = await supabase.from("leaves").insert({
          user_id: user.id,
          start_date: today,
          end_date: today,
          type: settings.auto_leave_type,
          reason: "Automatically marked absent - no check-in recorded",
          status: "approved",
          approver_notes: "Auto-generated due to missing attendance",
          source: "auto",
        });

        if (leaveError) {
          result.errors.push(`Failed to create leave for ${user.full_name}: ${leaveError.message}`);
          continue;
        }

        await createNotification({
          user_id: user.id,
          title: "Absent - Leave Recorded",
          body: `You were marked absent for ${formattedDate} as no check-in was recorded. A ${settings.auto_leave_type} leave has been automatically created.`,
          type: "attendance",
        });

        await supabase.from("attendance_notifications").insert({
          user_id: user.id,
          date: today,
          notification_type: "auto_leave",
        });

        result.leavesCreated++;
      } catch (err) {
        result.errors.push(`Failed to create auto-leave for ${user.full_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (result.notificationsSent > 0 || result.leavesCreated > 0) {
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/leaves");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function getAbsentUsersForToday(): Promise<{
  users: Array<{ id: string; full_name: string; role: string; notified: boolean; leaveCreated: boolean }>;
  settings: AttendanceSettings;
}> {
  const supabase = createAdminClient();
  const settings = await getAttendanceSettingsAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data: activeUsers } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("is_active", true);

  const { data: todayAttendance } = await supabase
    .from("attendance")
    .select("user_id")
    .eq("date", today);

  const { data: todayLeaves } = await supabase
    .from("leaves")
    .select("user_id, status")
    .lte("start_date", today)
    .gte("end_date", today);

  const { data: sentNotifications } = await supabase
    .from("attendance_notifications")
    .select("user_id, notification_type")
    .eq("date", today);

  const checkedInUserIds = new Set((todayAttendance || []).map((a) => a.user_id));
  const usersOnLeave = new Set(
    (todayLeaves || [])
      .filter((l) => l.status === "approved" || l.status === "pending")
      .map((l) => l.user_id)
  );

  const notifiedUserIds = new Set(
    (sentNotifications || [])
      .filter((n) => n.notification_type === "reminder")
      .map((n) => n.user_id)
  );
  const autoLeaveUserIds = new Set(
    (sentNotifications || [])
      .filter((n) => n.notification_type === "auto_leave")
      .map((n) => n.user_id)
  );

  const absentUsers = ((activeUsers || []) as User[])
    .filter((u) => !checkedInUserIds.has(u.id) && !usersOnLeave.has(u.id))
    .map((u) => ({
      ...u,
      notified: notifiedUserIds.has(u.id),
      leaveCreated: autoLeaveUserIds.has(u.id),
    }));

  return { users: absentUsers, settings };
}
