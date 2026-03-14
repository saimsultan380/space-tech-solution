"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifySuperAdmins, createNotification } from "@/lib/actions/notifications";

export async function getAttendance(filters?: {
  date?: string;
  user_id?: string;
  month?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("attendance")
    .select("*, user:users(id, full_name, role)")
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

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function checkIn() {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (existing) {
    throw new Error("You have already checked in today");
  }

  const { error } = await supabase.from("attendance").insert({
    user_id: user.id,
    date: today,
    check_in: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  await notifySuperAdmins({
    title: "Employee checked in",
    body: `${user.full_name} checked in on ${today}.`,
    type: "attendance",
  });

  revalidatePath("/dashboard/attendance");
}

export async function checkOut() {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: record } = await supabase
    .from("attendance")
    .select("id, check_out")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (!record) {
    throw new Error("You haven't checked in today");
  }

  if (record.check_out) {
    throw new Error("You have already checked out today");
  }

  const { error } = await supabase
    .from("attendance")
    .update({ check_out: new Date().toISOString() })
    .eq("id", record.id);

  if (error) throw new Error(error.message);

  await createNotification({
    user_id: user.id,
    title: "Check-out recorded",
    body: `Your check-out for ${today} was recorded successfully.`,
    type: "attendance",
  });

  revalidatePath("/dashboard/attendance");
}

export async function getTodayAttendance() {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  return data;
}

export async function getMonthlyAttendanceSummary(month?: string, userId?: string) {
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
    .eq("is_active", true);

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
