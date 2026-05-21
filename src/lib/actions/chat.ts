"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Internal row shapes for Supabase query results ───────────────────────────

interface ChannelMemberRow {
  user_id: string;
}

interface ChannelIdRow {
  channel_id: string;
}

interface RpcChannelRow {
  id: string;
  name: string;
  description: string;
  is_direct: boolean;
  created_by: string | null;
  created_at: string;
  avatar_url: string | null;
  last_message_content: string | null;
  last_message_sender_name: string | null;
  last_message_created_at: string | null;
  dm_partner_id: string | null;
  dm_partner_name: string | null;
  dm_partner_avatar_url: string | null;
}

interface RawChatMessageRow {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_pinned: boolean | null;
  updated_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_id: string | null;
  sender:
    | { id: string; full_name: string; avatar_url: string | null; role: string }
    | { id: string; full_name: string; avatar_url: string | null; role: string }[]
    | null;
}

interface RawChatEventRow {
  id: string;
  channel_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  is_reminder_sent: boolean;
  created_at: string;
  creator:
    | { full_name: string; avatar_url: string | null }
    | { full_name: string; avatar_url: string | null }[]
    | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseSender(
  raw: RawChatMessageRow,
): ChatMessage["sender"] {
  const s = raw.sender;
  if (!s) return undefined;
  return Array.isArray(s) ? s[0] : s;
}

function normaliseCreator(
  raw: RawChatEventRow,
): ChatEvent["creator"] {
  const c = raw.creator;
  if (!c) return undefined;
  return Array.isArray(c) ? c[0] : c;
}

// ─── Exported actions ─────────────────────────────────────────────────────────

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

export interface ChatEvent {
  id: string;
  channel_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  is_reminder_sent: boolean;
  created_at: string;
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export async function getMyChannels(): Promise<ChatChannel[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_chat_channels");

  if (error || !data) {
    console.error("Error fetching channels:", error);
    return [];
  }

  return (data as unknown as RpcChannelRow[]).map((ch) => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    is_direct: ch.is_direct,
    created_by: ch.created_by,
    created_at: ch.created_at,
    avatar_url: ch.avatar_url,
    last_message: ch.last_message_content
      ? {
          content: ch.last_message_content,
          sender_name: ch.last_message_sender_name ?? "",
          created_at: ch.last_message_created_at ?? "",
        }
      : null,
    dm_partner: ch.dm_partner_id
      ? {
          id: ch.dm_partner_id,
          full_name: ch.dm_partner_name ?? "",
          avatar_url: ch.dm_partner_avatar_url,
        }
      : null,
  })) as ChatChannel[];
}

export async function getChannelMessages(
  channelId: string,
  limit = 50 // Reduced default limit for faster initial load
): Promise<ChatMessage[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from("chat_messages")
    .select("id, channel_id, sender_id, content, created_at, is_edited, is_deleted, is_pinned, updated_at, attachment_url, attachment_name, attachment_type, attachment_size, reply_to_id, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false }) // Fetch newest first for optimization
    .limit(limit);

  if (!data) return [];

  // Reverse back to ascending for UI
  const sortedData = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const replyIds = sortedData.filter((m) => m.reply_to_id).map((m) => m.reply_to_id as string);
  const replyMap: Record<string, { id: string; content: string; sender_id: string; sender?: { full_name: string } | null }> = {};

  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from("chat_messages")
      .select("id, content, sender_id, sender:users!chat_messages_sender_id_fkey(full_name)")
      .in("id", replyIds.slice(0, 50));
    if (replies) {
      for (const r of replies) {
        replyMap[r.id] = { id: r.id, content: r.content, sender_id: r.sender_id, sender: r.sender as unknown as { full_name: string } | null };
      }
    }
  }

  return (sortedData as unknown as RawChatMessageRow[]).map((m) => ({
    ...m,
    sender: normaliseSender(m),
    is_pinned: m.is_pinned ?? false,
    reply_to: m.reply_to_id ? replyMap[m.reply_to_id] ?? null : null,
  })) as ChatMessage[];
}

export async function getFullChannelData(channelId: string) {
  // A single server action to fetch all necessary data for a channel,
  // drastically reducing network latency and redundant auth checks.
  await requireAuth();
  
  const [messages, members, pinnedMessages, events] = await Promise.all([
    getChannelMessages(channelId),
    getChannelMembers(channelId),
    getPinnedMessages(channelId),
    getChannelEvents(channelId),
  ]);

  return {
    messages,
    members,
    pinnedMessages,
    events,
  };
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

      const notificationRows = members.map((m: ChannelMemberRow) => ({
        user_id: m.user_id,
        title: notificationTitle,
        body: content.length > 100 ? content.substring(0, 97) + "..." : content,
        type: "chat",
        is_read: false,
      }));

      const adminSupabase = createAdminClient();
      await adminSupabase.from("notifications").insert(notificationRows);
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

  const { data, error } = await supabase
    .from("chat_channel_members")
    .select("user:users(id, full_name, avatar_url, role, is_active)")
    .eq("channel_id", channelId);

  if (error || !data) return [];

  type MemberUserRow = { user: { id: string; full_name: string; avatar_url: string | null; role: string; is_active: boolean } | null };
  type MemberUser = NonNullable<MemberUserRow["user"]>;
  return (data as unknown as MemberUserRow[])
    .map((m) => m.user)
    .filter((u): u is MemberUser => u !== null);
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

  const isSelf = otherUserId === user.id;

  if (isSelf) {
    // For self-chat, the RPC won't work (requires two distinct member rows).
    // Query directly for an existing self-chat channel.
    const adminSupabase = createAdminClient();
    const { data: existing } = await adminSupabase
      .from("chat_channel_members")
      .select("channel_id, chat_channels!inner(id, is_direct, deleted_at)")
      .eq("user_id", user.id)
      .eq("chat_channels.is_direct", true)
      .is("chat_channels.deleted_at", null);

    // A self-chat channel has exactly one member row — find it
    if (existing && existing.length > 0) {
      // Check which of these channels has only one member (self-chat)
      for (const row of existing) {
        const { count } = await adminSupabase
          .from("chat_channel_members")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", row.channel_id);
        if (count === 1) {
          return { error: null, channelId: row.channel_id as string };
        }
      }
    }

    // Create new self-chat channel
    const { data: channel, error } = await adminSupabase
      .from("chat_channels")
      .insert({
        name: `${user.full_name} (My Notes)`,
        description: "Your personal notes",
        is_direct: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    if (!channel) return { error: "Failed to create self-chat" };

    await adminSupabase.from("chat_channel_members").insert([
      { channel_id: channel.id, user_id: user.id },
    ]);

    revalidatePath("/chat");
    return { error: null, channelId: channel.id as string };
  }

  // Regular DM between two different users
  const { data: existingChannel } = await supabase.rpc("get_direct_message_channel", {
    other_user_id: otherUserId,
  });

  if (existingChannel && existingChannel.length > 0) {
    const first = existingChannel[0] as unknown as { channel_id: string };
    return { error: null, channelId: first.channel_id };
  }

  const { data: otherUser } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", otherUserId)
    .single();

  const channelName = `${user.full_name}, ${otherUser?.full_name ?? "Unknown"}`;

  const adminSupabase = createAdminClient();

  const { data: channel, error } = await adminSupabase
    .from("chat_channels")
    .insert({
      name: channelName,
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
  return { error: null, channelId: channel.id as string };
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
    .select("id, channel_id, sender_id, content, created_at, is_edited, is_deleted, is_pinned, updated_at, attachment_url, attachment_name, attachment_type, attachment_size, reply_to_id, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .eq("channel_id", channelId)
    .eq("is_pinned", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? [] as unknown as RawChatMessageRow[]).map((m) => ({ 
    ...m, 
    is_pinned: true,
    sender: normaliseSender(m as unknown as RawChatMessageRow),
  })) as ChatMessage[];
}

export async function searchMessages(query: string): Promise<{ messages: ChatMessage[]; channels: ChatChannel[] }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", user.id)
    .limit(100);

  if (!memberships || memberships.length === 0) return { messages: [], channels: [] };

  const channelIds = memberships.map((m: ChannelIdRow) => m.channel_id);

  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("id, channel_id, sender_id, content, created_at, is_edited, is_deleted, is_pinned, updated_at, attachment_url, attachment_name, attachment_type, attachment_size, reply_to_id, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
    .in("channel_id", channelIds)
    .eq("is_deleted", false)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: chs } = await supabase
    .from("chat_channels")
    .select("id, name, description, is_direct, created_by, created_at, avatar_url")
    .in("id", channelIds)
    .ilike("name", `%${query}%`);

  return {
    messages: (msgs ?? [] as unknown as RawChatMessageRow[]).map((m) => ({
      ...m,
      sender: normaliseSender(m as unknown as RawChatMessageRow),
      is_pinned: (m as unknown as RawChatMessageRow).is_pinned ?? false,
    })) as ChatMessage[],
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
  const supabase = await createClient();

  // Allow super_admin or the channel creator
  if (user.role !== "super_admin") {
    const { data: channel } = await supabase
      .from("chat_channels")
      .select("created_by, is_direct")
      .eq("id", channelId)
      .single();

    const isMember = channel?.is_direct
      ? (await supabase.from("chat_channel_members").select("user_id").eq("channel_id", channelId).eq("user_id", user.id).maybeSingle()).data !== null
      : channel?.created_by === user.id;

    if (!isMember) return { error: "You don't have permission to clear this chat" };
  }

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
  const supabase = await createClient();

  // Allow super_admin or the channel creator (for groups) or any member (for DMs)
  if (user.role !== "super_admin") {
    const { data: channel } = await supabase
      .from("chat_channels")
      .select("created_by, is_direct")
      .eq("id", channelId)
      .single();

    if (channel?.is_direct) {
      // For DMs, any participant can delete
      const { data: membership } = await supabase
        .from("chat_channel_members")
        .select("user_id")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) return { error: "You are not a participant of this chat" };
    } else {
      // For group channels, only the creator can delete
      if (channel?.created_by !== user.id) return { error: "Only the channel creator or an admin can delete this channel" };
    }
  }

  const { error } = await supabase
    .from("chat_channels")
    .delete()
    .eq("id", channelId);

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}

/**
 * Leave a DM / remove yourself from a channel without deleting it for others.
 * Used when a user clicks the delete icon on a DM in their sidebar.
 */
export async function leaveDmChannel(channelId: string) {
  const user = await requireAuth();
  const adminSupabase = createAdminClient();

  // Verify the user is actually a member
  const { data: membership } = await adminSupabase
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "You are not a member of this chat" };

  // Remove the user from the channel members
  const { error } = await adminSupabase
    .from("chat_channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", user.id);

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

  const currentIds = new Set((current ?? []).map((m: ChannelMemberRow) => m.user_id));
  const nextIds = new Set(memberIds);

  const toAdd = memberIds.filter((id: string) => !currentIds.has(id));
  const toRemove = (current ?? [])
    .map((m: ChannelMemberRow) => m.user_id)
    .filter((id: string) => !nextIds.has(id));

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

export async function getChannelEvents(channelId: string): Promise<ChatEvent[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_events")
    .select("id, channel_id, creator_id, title, description, event_date, is_reminder_sent, created_at, creator:users(full_name, avatar_url)")
    .eq("channel_id", channelId)
    .order("event_date", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Error fetching chat events:", error);
    return [];
  }

  return (data || [] as unknown as RawChatEventRow[]).map((event) => ({
    ...event,
    creator: normaliseCreator(event as unknown as RawChatEventRow),
  })) as ChatEvent[];
}

export async function getAllMyEvents(): Promise<ChatEvent[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch channel IDs user belongs to
  const { data: memberships } = await supabase
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", user.id)
    .limit(100);

  if (!memberships || memberships.length === 0) return [];

  const channelIds = memberships.map((m: ChannelIdRow) => m.channel_id);

  const { data, error } = await supabase
    .from("chat_events")
    .select("id, channel_id, creator_id, title, description, event_date, is_reminder_sent, created_at, creator:users(full_name, avatar_url)")
    .in("channel_id", channelIds)
    .order("event_date", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Error fetching all chat events:", error);
    return [];
  }

  return (data || [] as unknown as RawChatEventRow[]).map((event) => ({
    ...event,
    creator: normaliseCreator(event as unknown as RawChatEventRow),
  })) as ChatEvent[];
}

export async function createChatEvent(params: {
  channel_id: string;
  title: string;
  description: string;
  event_date: string;
}): Promise<{ data?: ChatEvent; error?: unknown }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_events")
    .insert({
      channel_id: params.channel_id,
      creator_id: user.id,
      title: params.title,
      description: params.description,
      event_date: params.event_date,
    })
    .select("*, creator:users(full_name, avatar_url)")
    .single();

  if (error) {
    console.error("Error creating chat event:", error);
    return { error };
  }

  // Create notifications for other members
  try {
    const { data: members } = await supabase
      .from("chat_channel_members")
      .select("user_id")
      .eq("channel_id", params.channel_id)
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const { data: channel } = await supabase
        .from("chat_channels")
        .select("name, is_direct")
        .eq("id", params.channel_id)
        .single();

      const notificationTitle = `New Event: ${params.title}`;
      const notificationBody = `A new event has been scheduled for ${new Date(params.event_date).toLocaleString()}`;

      const notificationRows = members.map((m: ChannelMemberRow) => ({
        user_id: m.user_id,
        title: notificationTitle,
        body: notificationBody,
        type: "chat",
        is_read: false,
      }));

      const adminSupabase = createAdminClient();
      await adminSupabase.from("notifications").insert(notificationRows);
    }
  } catch (err) {
    console.error("Failed to create event notifications:", err);
  }

  revalidatePath("/chat");
  return { data: data as unknown as ChatEvent };
}

export async function updateChatEvent(
  eventId: string,
  updates: { title?: string; description?: string; event_date?: string }
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_events")
    .update(updates)
    .eq("id", eventId)
    .eq("creator_id", user.id); // Only creator can update

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}

export async function deleteChatEvent(eventId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_events")
    .delete()
    .eq("id", eventId)
    .eq("creator_id", user.id); // Only creator can delete

  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { error: null };
}
