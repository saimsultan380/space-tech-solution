"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { notifySuperAdmins, createNotification } from "@/lib/actions/notifications";
import { getAttendanceSettings } from "@/lib/actions/attendance-settings";



function toMinutesFromTimeString(time: string) {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
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

export async function getAttendance(filters?: {
  date?: string;
  user_id?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("attendance")
    .select("id, user_id, date, check_in, check_out, created_at, user:users(id, full_name, role)", { count: "exact" })
    .order("date", { ascending: false });

  if (filters?.date) {
    query = query.eq("date", filters.date);
  }
  if (filters?.month) {
    const monthStart = `${filters.month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("date", monthStart).lt("date", monthEnd);
  }
  if (filters?.user_id && filters.user_id !== "all") {
    query = query.eq("user_id", filters.user_id);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  
  return {
    data: (data || []).map((item: any) => ({
      ...item,
      user: Array.isArray(item.user) ? item.user[0] : item.user,
    })),
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function checkIn() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { dateISO: today, minutes: currentMinutes } = getNowInTimeZone();
    const settings = await getAttendanceSettings();
    const shiftStartMinutes = toMinutesFromTimeString(settings.shift_start_time);
    const latestCheckInMinutes = toMinutesFromTimeString(settings.checkout_latest_time);

    if (currentMinutes < shiftStartMinutes) {
      return { ok: false, error: `Check-in is not available yet. Check-in opens at ${settings.shift_start_12h}.` };
    }
    if (currentMinutes > latestCheckInMinutes) {
      return { ok: false, error: `Check-in window has closed. Check-in was available until ${settings.checkout_latest_12h}.` };
    }

    const { data: existing, error: existingError } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    // Supabase returns an error when `.single()` finds no rows; treat that as "not existing".
    if (existingError && existingError.code !== "PGRST116") {
      return { ok: false, error: existingError.message };
    }

    if (existing) {
      return { ok: false, error: "You have already checked in today" };
    }

    const { error } = await supabase.from("attendance").insert({
      user_id: user.id,
      date: today,
      check_in: new Date().toISOString(),
    });

    if (error) return { ok: false, error: error.message };

    await notifySuperAdmins({
      title: "Employee checked in",
      body: `${user.full_name} checked in on ${today}.`,
      type: "attendance",
    });

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to check in" };
  }
}

export async function checkOut() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { dateISO: today, minutes: currentMinutes } = getNowInTimeZone();
    const settings = await getAttendanceSettings();
    const shiftEndMinutes = toMinutesFromTimeString(settings.shift_end_time);
    const computedLatestCheckOutMinutes =
      (settings.checkout_grace_minutes ?? 0) > 0
        ? Math.min(24 * 60 - 1, shiftEndMinutes + Math.max(0, settings.checkout_grace_minutes))
        : toMinutesFromTimeString(settings.checkout_latest_time);

    const earliestAllowedMinutes =
      settings.allow_early_checkout
        ? Math.max(0, shiftEndMinutes - Math.max(0, settings.early_checkout_minutes ?? 0))
        : shiftEndMinutes;

    if (currentMinutes < earliestAllowedMinutes) {
      return { ok: false, error: `Check-out is not available yet. You can checkout after ${settings.shift_end_12h}.` };
    }
    if (currentMinutes > computedLatestCheckOutMinutes) {
      return { ok: false, error: `Check-out window has closed. Checkout was available until ${settings.checkout_latest_12h}.` };
    }

    const { data: record, error: recordError } = await supabase
      .from("attendance")
      .select("id, check_out")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (recordError) {
      if (recordError.code === "PGRST116") {
        return { ok: false, error: "You haven't checked in today" };
      }
      return { ok: false, error: recordError.message };
    }

    if (!record) {
      return { ok: false, error: "You haven't checked in today" };
    }

    if (record.check_out) {
      return { ok: false, error: "You have already checked out today" };
    }

    const { error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", record.id);

    if (error) return { ok: false, error: error.message };

    await createNotification({
      user_id: user.id,
      title: "Check-out recorded",
      body: `Your check-out for ${today} was recorded successfully.`,
      type: "attendance",
    });

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to check out" };
  }
}

export const getTodayAttendance = cache(async () => {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("attendance")
    .select("id, user_id, date, check_in, check_out, created_at")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  return data;
});

export async function getMonthlyAttendanceSummary(month?: string, userId?: string) {
  await requireAuth();
  const supabase = await createClient();

  const targetMonth = month || new Date().toISOString().substring(0, 7);
  const monthStart = targetMonth + "-01";
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  const attendanceQuery = supabase
    .from("attendance")
    .select("user_id, date, check_in, check_out")
    .gte("date", monthStart)
    .lt("date", monthEnd);

  const usersQuery = supabase
    .from("users")
    .select("id, full_name, role")
    .eq("is_active", true)
    .limit(500);

  const [attendanceRes, usersRes] = await Promise.all([
    userId ? attendanceQuery.eq("user_id", userId) : attendanceQuery,
    userId ? usersQuery.eq("id", userId) : usersQuery,
  ]);

  const attendance = attendanceRes.data || [];
  const users = usersRes.data || [];

  const daysInMonth = Math.round(
    (nextMonth.getTime() - new Date(monthStart).getTime()) / 86400000
  );
  const workingDays = Math.min(
    daysInMonth,
    Math.ceil(daysInMonth * (5 / 7))
  );

  return users.map((u: { id: string; full_name: string; role: string }) => {
    const userRecords = attendance.filter(
      (a: { user_id: string }) => a.user_id === u.id
    );
    const totalHours = userRecords.reduce((sum: number, a: { check_in: string; check_out: string | null }) => {
      if (!a.check_out) return sum;
      return sum + (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000;
    }, 0);
    const avgHoursPerDay = userRecords.length > 0 ? totalHours / userRecords.length : 0;

    return {
      userId: u.id,
      name: u.full_name,
      role: u.role,
      daysPresent: userRecords.length,
      workingDays,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
      attendanceRate:
        workingDays > 0 ? Math.round((userRecords.length / workingDays) * 100) : 0,
    };
  });
}
