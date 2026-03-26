"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { LeaveStatus } from "@/lib/types";
import { notifySuperAdmins, notifyLeaveApproved } from "@/lib/actions/notifications";

interface LeaveFilters {
  status?: LeaveStatus | "all";
  month?: string;
  user_id?: string;
  page?: number;
  pageSize?: number;
}

export async function getLeavesForCurrentUser(filters?: Omit<LeaveFilters, "user_id">) {
  const user = await requireAuth();
  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("leaves")
    .select("*, user:users!leaves_user_id_fkey(id, full_name, role), approver:users!leaves_approver_id_fkey(id, full_name)", { count: "exact" })
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.month) {
    const monthStart = `${filters.month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("start_date", monthStart).lt("start_date", monthEnd);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  
  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getAllLeaves(filters?: LeaveFilters) {
  const user = await requireAuth();
  if (user.role !== "super_admin") {
    throw new Error("Only super admins can view all leaves");
  }

  const supabase = await createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("leaves")
    .select("*, user:users!leaves_user_id_fkey(id, full_name, role), approver:users!leaves_approver_id_fkey(id, full_name)", { count: "exact" })
    .order("start_date", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.user_id && filters.user_id !== "all") {
    query = query.eq("user_id", filters.user_id);
  }
  if (filters?.month) {
    const monthStart = `${filters.month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];
    query = query.gte("start_date", monthStart).lt("start_date", monthEnd);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  
  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function createLeave(formData: {
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  if (!formData.start_date || !formData.end_date) {
    throw new Error("Start and end dates are required");
  }

  const start = new Date(formData.start_date);
  const end = new Date(formData.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid dates");
  }
  if (end < start) {
    throw new Error("End date cannot be before start date");
  }

  const maxDays = 30;
  const diffDays = (end.getTime() - start.getTime()) / 86400000 + 1;
  if (diffDays > maxDays) {
    throw new Error(`Leave duration cannot exceed ${maxDays} days`);
  }

  const { error } = await supabase.from("leaves").insert({
    user_id: user.id,
    start_date: formData.start_date,
    end_date: formData.end_date,
    type: formData.type,
    reason: formData.reason,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  const period =
    formData.start_date === formData.end_date
      ? formData.start_date
      : `${formData.start_date} to ${formData.end_date}`;

  await notifySuperAdmins({
    title: "New leave request",
    body: `${user.full_name} requested ${formData.type} leave for ${period}.`,
    type: "leave",
  });

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
}

export async function updateLeaveStatus(
  id: string,
  status: LeaveStatus,
  approverNotes?: string
) {
  const user = await requireAuth();
  if (user.role !== "super_admin") {
    throw new Error("Only super admins can update leave status");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leaves")
    .update({
      status,
      approver_id: user.id,
      approver_notes: approverNotes ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await notifyLeaveApproved(id);

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
}

