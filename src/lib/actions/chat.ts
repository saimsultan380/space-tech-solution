"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  is_direct: boolean;
  created_by: string | null;
  created_at: string;
  avatar_url: string | null;
  last_message?: { content: string; sender_name: string; created_at: string } | null;
  dm_partner?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_pinned: boolean;
  updated_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_id: string | null;
  reply_to?: {
    id: string;
    content: string;
    sender_id: string;
    sender?: { full_name: string } | null;
  } | null;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

export async function getMyChannels(): Promise<ChatChannel[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const channelIds = memberships.map((m) => m.channel_id);

  const { data: channels } = await supabase
    .from("chat_channels")
    .select("*")
    .in("id", channelIds)
    .order("created_at", { ascending: true });

  if (!channels) return [];

  const channelsWithPreview: ChatChannel[] = [];
  for (const ch of channels) {
    const { data: lastMsg } = await supabase
      .from("chat_messages")
      .select("content, created_at, sender:users!chat_messages_sender_id_fkey(full_name)")
      .eq("channel_id", ch.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dmPartner: ChatChannel["dm_partner"] = null;
    if (ch.is_direct) {
      const { data: dmMembers } = await supabase
        .from("chat_channel_members")
        .select("user_id")
        .eq("channel_id", ch.id)
        .neq("user_id", user.id);

      if (dmMembers && dmMembers.length > 0) {
        const { data: otherUser } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .eq("id", dmMembers[0].user_id)
          .single();
        if (otherUser) dmPartner = otherUser;
      }
    }

    channelsWithPreview.push({
      ...ch,
      last_message: lastMsg
        ? {
            content: lastMsg.content,
            sender_name: (lastMsg.sender as unknown as { full_name: string })?.full_name ?? "",
            created_at: lastMsg.created_at,
          }
        : null,
      dm_partner: dmPartner,
    });
  }

  channelsWithPreview.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.created_at;
    const bTime = b.last_message?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return channelsWithPreview;
}

export async function getChannelMessages(
  channelId: string,
  limit = 300
): Promise<ChatMessage[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from("chat_messages")
    .select("*, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  const replyIds = data.filter((m) => m.reply_to_id).map((m) => m.reply_to_id!);
  const replyMap: Record<string, { id: string; content: string; sender_id: string; sender?: { full_name: string } | null }> = {};

  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from("chat_messages")
      .select("id, content, sender_id, sender:users!chat_messages_sender_id_fkey(full_name)")
      .in("id", replyIds);
    if (replies) {
      for (const r of replies) {
        replyMap[r.id] = { id: r.id, content: r.content, sender_id: r.sender_id, sender: r.sender as unknown as { full_name: string } | null };
      }
    }
  }

  return data.map((m) => ({
    ...m,
    is_pinned: m.is_pinned ?? false,
    reply_to: m.reply_to_id ? replyMap[m.reply_to_id] ?? null : null,
  })) as ChatMessage[];
}

export async function sendMessage(
  channelId: string,
  content: string,
  opts?: {
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
    attachmentSize?: number;
    replyToId?: string;
  }
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const trimmed = content.trim();
  if (!trimmed && !opts?.attachmentUrl) return { error: "Message cannot be empty" };

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content: trimmed,
      attachment_url: opts?.attachmentUrl ?? null,
      attachment_name: opts?.attachmentName ?? null,
      attachment_type: opts?.attachmentType ?? null,
      attachment_size: opts?.attachmentSize ?? null,
      reply_to_id: opts?.replyToId ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create notifications for other members
  try {
    const { data: members } = await supabase
      .from("chat_channel_members")
      .select("user_id")
      .eq("channel_id", channelId)
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const { data: channel } = await supabase
        .from("chat_channels")
        .select("name, is_direct")
        .eq("id", channelId)
        .single();

      const notificationTitle = channel?.is_direct 
        ? `New message from ${user.full_name}`
        : `New message in #${channel?.name}`;

      const notificationRows = members.map((m) => ({
        user_id: m.user_id,
        title: notificationTitle,
        body: content.length > 100 ? content.substring(0, 97) + "..." : content,
        type: "chat",
        is_read: false,
      }));

      await supabase.from("notifications").insert(notificationRows);
    }
  } catch (err) {
    console.error("Failed to create chat notifications:", err);
  }

  revalidatePath("/chat");
  return { error: null, messageId: data?.id };
}

export async function editMessage(messageId: string, newContent: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const trimmed = newContent.trim();
  if (!trimmed) return { error: "Message cannot be empty" };

  const { error } = await supabase
    .from("chat_messages")
    .update({ content: trimmed, is_edited: true, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteMessage(messageId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_messages")
    .update({ is_deleted: true, content: "", updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getChannelMembers(channelId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId);

  if (!memberships || memberships.length === 0) return [];
  const userIds = memberships.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, avatar_url, role, is_active")
    .in("id", userIds);

  return (users ?? []) as { id: string; full_name: string; avatar_url: string | null; role: string; is_active: boolean }[];
}

export async function createChannel(name: string, description: string, memberIds: string[]) {
  const user = await requireAuth();
  if (user.role !== "super_admin") return { error: "Only admins can create channels" };

  const supabase = await createClient();

  const { data: channel, error: insertError } = await supabase
    .from("chat_channels")
    .insert({ name: name.trim(), description: description.trim(), created_by: user.id })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!channel) return { error: "Failed to create channel" };

  const allMembers = Array.from(new Set([user.id, ...memberIds]));
  const memberships = allMembers.map((uid) => ({ channel_id: channel.id, user_id: uid }));
  const { error: memberError } = await supabase.from("chat_channel_members").insert(memberships);
  if (memberError) return { error: memberError.message };

  revalidatePath("/chat");
  return { error: null, channelId: channel.id as string };
}

export async function createDirectMessage(otherUserId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // First, check if a DM channel already exists between these two users
  const { data: existingChannel } = await supabase.rpc("get_direct_message_channel", {
    other_user_id: otherUserId
  });

  if (existingChannel) {
    return { error: null, channelId: existingChannel };
  }

  // If not found via RPC or if RPC doesn't exist, fallback to manual check
  const { data: myMemberships } = await supabase
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", user.id);

  if (myMemberships && myMemberships.length > 0) {
    const myChannelIds = myMemberships.map((m) => m.channel_id);

    const { data: directChannels } = await supabase
      .from("chat_channels")
      .select("id")
      .in("id", myChannelIds)
      .eq("is_direct", true);

    if (directChannels) {
      for (const ch of directChannels) {
        const { data: chMembers } = await supabase
          .from("chat_channel_members")
          .select("user_id")
          .eq("channel_id", ch.id);

        if (chMembers && chMembers.length === 2 && chMembers.some((m) => m.user_id === otherUserId)) {
          return { error: null, channelId: ch.id };
        }
      }
    }
  }

  const { data: otherUser } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", otherUserId)
    .single();

  const dmName = `${user.full_name}, ${otherUser?.full_name ?? "Unknown"}`;

  // Use admin client to bypass RLS for channel creation and member addition
  // since non-admins currently don't have 'insert' permission on these tables.
  const adminSupabase = createAdminClient();

  const { data: channel, error } = await adminSupabase
    .from("chat_channels")
    .insert({
      name: dmName,
      description: "Direct message",
      is_direct: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!channel) return { error: "Failed to create DM" };

  await adminSupabase.from("chat_channel_members").insert([
    { channel_id: channel.id, user_id: user.id },
    { channel_id: channel.id, user_id: otherUserId },
  ]);

  revalidatePath("/chat");
  return { error: null, channelId: channel.id };
}

export async function pinMessage(messageId: string) {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_pinned: true })
    .eq("id", messageId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function unpinMessage(messageId: string) {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_pinned: false })
    .eq("id", messageId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function getPinnedMessages(channelId: string): Promise<ChatMessage[]> {
  await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .eq("channel_id", channelId)
    .eq("is_pinned", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  return (data ?? []).map((m) => ({ ...m, is_pinned: true })) as ChatMessage[];
}

export async function searchMessages(query: string): Promise<{ messages: ChatMessage[]; channels: ChatChannel[] }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return { messages: [], channels: [] };

  const channelIds = memberships.map((m) => m.channel_id);

  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("*, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .in("channel_id", channelIds)
    .eq("is_deleted", false)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: chs } = await supabase
    .from("chat_channels")
    .select("*")
    .in("id", channelIds)
    .ilike("name", `%${query}%`);

  return {
    messages: (msgs ?? []).map((m) => ({ ...m, is_pinned: m.is_pinned ?? false })) as ChatMessage[],
    channels: (chs ?? []) as ChatChannel[],
  };
}

export async function updateChannel(channelId: string, updates: { name?: string; description?: string; avatar_url?: string | null }) {
  const user = await requireAuth();
  if (user.role !== "super_admin") return { error: "Only admins can edit channels" };

  const supabase = await createClient();
  const cleanUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
  if (updates.description !== undefined) cleanUpdates.description = updates.description.trim();
  if (updates.avatar_url !== undefined) cleanUpdates.avatar_url = updates.avatar_url;

  const { error } = await supabase
    .from("chat_channels")
    .update(cleanUpdates)
    .eq("id", channelId);

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}

export async function clearChannelMessages(channelId: string) {
  const user = await requireAuth();
  if (user.role !== "super_admin") return { error: "Only admins can clear chat" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("channel_id", channelId);

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}

export async function deleteChannel(channelId: string) {
  const user = await requireAuth();
  if (user.role !== "super_admin") return { error: "Only admins can delete channels" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_channels")
    .delete()
    .eq("id", channelId);

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}

export async function setChannelMembers(channelId: string, memberIds: string[]) {
  const user = await requireAuth();
  if (user.role !== "super_admin") return { error: "Only admins can edit members" };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId);

  const currentIds = new Set((current ?? []).map((m) => m.user_id as string));
  const nextIds = new Set(memberIds);

  const toAdd = memberIds.filter((id) => !currentIds.has(id));
  const toRemove = (current ?? [])
    .map((m) => m.user_id as string)
    .filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    const rows = toAdd.map((uid) => ({ channel_id: channelId, user_id: uid }));
    const { error: addErr } = await supabase.from("chat_channel_members").insert(rows);
    if (addErr) return { error: addErr.message };
  }

  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("chat_channel_members")
      .delete()
      .eq("channel_id", channelId)
      .in("user_id", toRemove);
    if (delErr) return { error: delErr.message };
  }

  revalidatePath("/chat");
  return { error: null };
}
