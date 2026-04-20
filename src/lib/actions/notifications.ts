"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface CreateNotificationInput {
  user_id: string;
  title: string;
  body: string;
  type?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await requireAuth();
    const supabase = createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: input.user_id,
      title: input.title,
      body: input.body,
      type: input.type ?? "info",
      is_read: false,
    });
    if (error) {
      console.error("Failed to create notification:", error.message);
    }
  } catch (err) {
    console.error("Notification error:", err);
  }
}

export async function notifySuperAdmins(payload: {
  title: string;
  body: string;
  type?: string;
}) {
  try {
    await requireAuth();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("role", "super_admin")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to fetch super admins:", error.message);
      return;
    }
    const admins = data || [];
    if (admins.length === 0) return;

    const rows = admins.map((a) => ({
      user_id: a.id,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? "info",
      is_read: false,
    }));

    const { error: insertError } = await supabase.from("notifications").insert(rows);
    if (insertError) {
      console.error("Failed to insert notifications:", insertError.message);
    }
  } catch (err) {
    console.error("Notification error:", err);
  }
}

export async function notifyLeaveApproved(leaveId: string) {
  try {
    const supabase = createAdminClient();
    const user = await requireAuth();

    const { data, error } = await supabase
      .from("leaves")
      .select("id, user_id, start_date, end_date, type, status, user:users(id, full_name)")
      .eq("id", leaveId)
      .single();

    if (error || !data) return;

    const applicantId = data.user_id as string;
    const period =
      data.start_date === data.end_date || !data.end_date
        ? data.start_date
        : `${data.start_date} to ${data.end_date}`;

    const title =
      data.status === "approved"
        ? "Leave request approved"
        : data.status === "rejected"
        ? "Leave request rejected"
        : "Leave request updated";

    const body =
      data.status === "approved"
        ? `Your ${data.type} leave for ${period} was approved by ${user.full_name}.`
        : data.status === "rejected"
        ? `Your ${data.type} leave for ${period} was rejected by ${user.full_name}.`
        : `Your ${data.type} leave for ${period} was updated by ${user.full_name}.`;

    await createNotification({
      user_id: applicantId,
      title,
      body,
      type: "leave",
    });
  } catch (err) {
    console.error("Notification error:", err);
  }
}

export async function getNotifications(type?: string) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id);
    
    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
  } catch (err) {
    console.error("Failed to get notifications:", err);
    return [];
  }
}

export async function markNotificationsAsRead(ids: string[]) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    revalidatePath("/chat");
    return { success: true };
  } catch (err) {
    console.error("Failed to mark notifications as read:", err);
    return { success: false, error: err };
  }
}

