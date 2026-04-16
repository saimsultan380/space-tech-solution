"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  getChannelMessages,
  getChannelMembers,
  createChannel,
  updateChannel,
  clearChannelMessages,
  deleteChannel,
  setChannelMembers,
  type ChatChannel,
  type ChatMessage,
} from "@/lib/actions/chat";
import { cn } from "@/lib/utils";
import {
  Hash,
  Send,
  Users,
  Plus,
  Loader2,
  X,
  Check,
  ChevronLeft,
  Smile,
  Pencil,
  Trash2,
  MoreVertical,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Search,
  Reply,
  Settings,
  Download,
  Ban,
  Camera,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface ChatClientProps {
  channels: ChatChannel[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  allUsers?: { id: string; full_name: string; avatar_url: string | null; role: string; is_active: boolean }[];
}

export function ChatClient({
  channels: initialChannels,
  currentUserId,
  currentUserName,
  currentUserRole,
  allUsers = [],
}: ChatClientProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(initialChannels[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<{ id: string; full_name: string; avatar_url: string | null; role: string; is_active?: boolean }[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // UI panels
  const [showMembers, setShowMembers] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChannelSettings, setShowChannelSettings] = useState(false);

  // Create channel dialog
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Message actions
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Channel settings
  const [editChName, setEditChName] = useState("");
  const [editChDesc, setEditChDesc] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [settingsMembers, setSettingsMembers] = useState<string[]>([]);
  const [channelActionError, setChannelActionError] = useState<string | null>(null);

  // Attachment
  const [uploading, setUploading] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Outside click handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttachMenu(false);
      setMenuMsgId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load messages + members when channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;
    async function load() {
      setLoadingMsgs(true);
      const [msgs, mems] = await Promise.all([
        getChannelMessages(activeChannelId!),
        getChannelMembers(activeChannelId!),
      ]);
      if (!cancelled) {
        setMessages(msgs);
        setMembers(mems as typeof members);
        setLoadingMsgs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeChannelId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Realtime subscriptions
  useEffect(() => {
    if (!activeChannelId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${activeChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          const sender = allUsers.find((u) => u.id === msg.sender_id) || members.find((m) => m.id === msg.sender_id);
          if (sender) msg.sender = { id: sender.id, full_name: sender.full_name, avatar_url: sender.avatar_url, role: sender.role };

          setMessages((prev) => {
            if (
              prev.some(
                (m) =>
                  m.id === msg.id ||
                  (m.id.startsWith("optimistic-") && m.sender_id === msg.sender_id && m.content === msg.content),
              )
            ) {
              return prev.map((m) =>
                m.id.startsWith("optimistic-") && m.sender_id === msg.sender_id && m.content === msg.content
                  ? { ...msg, sender: msg.sender }
                  : m,
              );
            }
            return [...prev, msg];
          });

          // Update channel preview + unread count
          setChannels((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.channel_id);
            if (idx === -1) return prev;
            const ch = prev[idx];
            const updated: ChatChannel = {
              ...ch,
              last_message: {
                content: msg.content || (msg.attachment_name ?? "Attachment"),
                sender_name: msg.sender?.full_name ?? "",
                created_at: msg.created_at,
              },
            };
            const rest = [...prev];
            rest.splice(idx, 1);
            return [updated, ...rest];
          });

          if (msg.sender_id !== currentUserId && msg.channel_id !== activeChannelId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.channel_id]: (prev[msg.channel_id] ?? 0) + 1,
            }));
          }
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id !== updated.id ? m : { ...m, content: updated.content, is_edited: updated.is_edited, is_deleted: updated.is_deleted, updated_at: updated.updated_at }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannelId, allUsers, members]);

  // ─── Handlers ───

  const handleSend = async () => {
    if ((!newMsg.trim()) || !activeChannelId || sending) return;
    const content = newMsg;
    const replyId = replyTo?.id;
    setNewMsg("");
    setReplyTo(null);
    setSending(true);

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      channel_id: activeChannelId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      updated_at: null,
      attachment_url: null,
      attachment_name: null,
      attachment_type: null,
      attachment_size: null,
      reply_to_id: replyId ?? null,
      reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, sender_id: replyTo.sender_id, sender: replyTo.sender ? { full_name: replyTo.sender.full_name } : null } : null,
      sender: { id: currentUserId, full_name: currentUserName, avatar_url: null, role: currentUserRole },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    await sendMessage(activeChannelId, content, { replyToId: replyId });
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, type: "image" | "doc") => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;
    setShowAttachMenu(false);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);

      // Optimistic
      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        channel_id: activeChannelId,
        sender_id: currentUserId,
        content: "",
        created_at: new Date().toISOString(),
        is_edited: false, is_deleted: false, updated_at: null,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
        attachment_size: file.size,
        reply_to_id: null, reply_to: null,
        sender: { id: currentUserId, full_name: currentUserName, avatar_url: null, role: currentUserRole },
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      await sendMessage(activeChannelId, "", {
        attachmentUrl: urlData.publicUrl,
        attachmentName: file.name,
        attachmentType: file.type,
        attachmentSize: file.size,
      });
    } catch {
      // Silently handle upload errors
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
    setMobileShowChat(true);
    setShowMembers(false);
    setMenuMsgId(null);
    setShowSearch(false);
    setReplyTo(null);
  };

  const handleMobileBack = () => { setMobileShowChat(false); setShowMembers(false); setShowSearch(false); };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    setCreateError(null);
    const result = await createChannel(newChannelName, newChannelDesc, selectedMembers);
    if (result.error) { setCreateError(result.error); setCreatingChannel(false); return; }
    if (result.channelId) {
      setShowNewChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setSelectedMembers([]);
      window.location.reload();
    }
    setCreatingChannel(false);
  };

  const handleStartEdit = (msg: ChatMessage) => { setEditingMsgId(msg.id); setEditContent(msg.content); setMenuMsgId(null); setTimeout(() => editInputRef.current?.focus(), 50); };

  const handleSaveEdit = async () => {
    if (!editingMsgId || !editContent.trim()) return;
    setMessages((prev) => prev.map((m) => m.id === editingMsgId ? { ...m, content: editContent, is_edited: true } : m));
    setEditingMsgId(null);
    await editMessage(editingMsgId, editContent);
    setEditContent("");
  };

  const handleDelete = async (msgId: string) => {
    setMenuMsgId(null);
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true, content: "" } : m));
    await deleteMessage(msgId);
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => { setNewMsg((prev) => prev + emojiData.emoji); setShowEmojiPicker(false); inputRef.current?.focus(); };

  const handleSaveChannelSettings = async () => {
    if (!activeChannelId) return;
    setSavingChannel(true);

    await updateChannel(activeChannelId, { name: editChName, description: editChDesc });
    const result = await setChannelMembers(activeChannelId, settingsMembers);

    if (!result.error) {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeChannelId ? { ...c, name: editChName, description: editChDesc } : c,
        ),
      );
      // Update local members from selected IDs
      const idSet = new Set(settingsMembers);
      setMembers(allUsers.filter((u) => idSet.has(u.id)));
      setShowChannelSettings(false);
    }

    setSavingChannel(false);
  };

  const handleClearChat = async () => {
    if (!activeChannelId) return;
    if (!confirm("Are you sure you want to clear all messages in this channel? This cannot be undone.")) return;
    await clearChannelMessages(activeChannelId);
    setMessages([]);
  };

  const handleDeleteChannel = async () => {
    if (!activeChannelId || !activeChannel) return;
    const name = activeChannel.name;
    if (!confirm(`Delete channel \"${name}\" and all its messages for everyone? This cannot be undone.`)) return;

    setSavingChannel(true);
    setChannelActionError(null);
    const result = await deleteChannel(activeChannelId);
    setSavingChannel(false);

    if (result.error) {
      setChannelActionError(result.error);
      return;
    }

    setChannels((prev) => prev.filter((c) => c.id !== activeChannelId));
    setActiveChannelId(null);
    setMessages([]);
    setMembers([]);
    setShowChannelSettings(false);
  };

  const handleChannelAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `channel-avatars/${activeChannelId}.${ext}`;
    await supabase.storage.from("chat-attachments").upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    await updateChannel(activeChannelId, { avatar_url: urlData.publicUrl });
    setChannels((prev) => prev.map((c) => c.id === activeChannelId ? { ...c, avatar_url: urlData.publicUrl } : c));
  };

  // ─── Helpers ───

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const filteredMessages = showSearch && searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formatTime = (dateStr: string) => timeFormatter.format(new Date(dateStr));

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getInitials = (name: string) => name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  const shouldShowDate = (msg: ChatMessage, idx: number) => {
    if (idx === 0) return true;
    return new Date(msg.created_at).toDateString() !== new Date(filteredMessages[idx - 1].created_at).toDateString();
  };

  const isImageType = (type: string | null) => type?.startsWith("image/");

  // ─── Render ───

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ═══ Left panel: Channel list ═══ */}
      <div className={cn("flex w-full flex-col border-r border-border bg-card md:w-[340px] md:shrink-0", mobileShowChat && "hidden md:flex")}>
        {/* Header */}
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(currentUserName)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Chats</h2>
              <p className="text-[11px] text-muted-foreground">{channels.length} channels</p>
            </div>
          </div>
          {currentUserRole === "super_admin" && (
            <button onClick={() => { setShowNewChannel(true); setCreateError(null); }} className="rounded-full p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="New channel">
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Channel search */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              placeholder="Search channels..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              onChange={(e) => {
                const q = e.target.value.toLowerCase();
                if (!q) { setChannels(initialChannels); return; }
                setChannels(initialChannels.filter((c) => c.name.toLowerCase().includes(q)));
              }}
            />
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto">
          {channels.map((ch) => {
            const unread = unreadCounts[ch.id] ?? 0;
            const isActive = activeChannelId === ch.id;
            return (
              <div
                key={ch.id}
                onClick={() => handleSelectChannel(ch.id)}
                role="button"
                tabIndex={0}
                className={cn(
                  "group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-muted/30",
                  isActive && "bg-primary/8 border-l-2 border-l-primary",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                  {ch.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ch.avatar_url} alt={ch.name} className="h-full w-full object-cover" />
                  ) : (
                    <Hash className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-14">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{ch.name}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {ch.last_message && (
                        <span
                          suppressHydrationWarning
                          className="text-[10px] text-muted-foreground"
                        >
                          {formatRelativeTime(ch.last_message.created_at)}
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                  {ch.last_message ? (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      <span className="font-medium">{ch.last_message.sender_name}:</span>{" "}
                      {ch.last_message.content || "Attachment"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-0.5 italic">No messages yet</p>
                  )}
                </div>
                {currentUserRole === "super_admin" && (
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveChannelId(ch.id);
                        setEditChName(ch.name);
                        setEditChDesc(ch.description);
                        setSettingsMembers(members.map((m) => m.id));
                        setShowChannelSettings(true);
                      }}
                      className="pointer-events-auto rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Edit channel"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          !confirm(
                            `Delete channel \"${ch.name}\" and all its messages for everyone? This cannot be undone.`,
                          )
                        )
                          return;
                        deleteChannel(ch.id).then((res) => {
                          if (!res.error) {
                            setChannels((prev) => prev.filter((c) => c.id !== ch.id));
                            if (activeChannelId === ch.id) {
                              setActiveChannelId(null);
                              setMessages([]);
                              setMembers([]);
                            }
                          }
                        });
                      }}
                      className="pointer-events-auto rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete channel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {channels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No channels</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right panel: Chat area ═══ */}
      <div className={cn("flex flex-1 min-w-0 flex-col bg-background", !mobileShowChat && "hidden md:flex")}>
        {activeChannel ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 bg-muted/40 border-b border-border px-3 py-2.5 sm:px-4">
              <button onClick={handleMobileBack} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"><ChevronLeft className="h-5 w-5" /></button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                {activeChannel.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeChannel.avatar_url} alt={activeChannel.name} className="h-full w-full object-cover" />
                ) : (
                  <Hash className="h-5 w-5" />
                )}
              </div>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  if (currentUserRole === "super_admin") {
                    setEditChName(activeChannel.name);
                    setEditChDesc(activeChannel.description);
                    setSettingsMembers(members.map((m) => m.id));
                    setShowChannelSettings(true);
                  }
                }}
              >
                <h3 className="text-sm font-bold text-foreground truncate">{activeChannel.name}</h3>
                <p className="text-[11px] text-muted-foreground">{members.length} members</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowSearch(!showSearch)} className={cn("shrink-0 rounded-full p-2 transition-colors", showSearch ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <Search className="h-4 w-4" />
                </button>
                <button onClick={() => setShowMembers(!showMembers)} className={cn("shrink-0 rounded-full p-2 transition-colors", showMembers ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <Users className="h-4 w-4" />
                </button>
                {currentUserRole === "super_admin" && (
                  <button
                    onClick={() => {
                      setEditChName(activeChannel.name);
                      setEditChDesc(activeChannel.description);
                      setSettingsMembers(members.map((m) => m.id));
                      setShowChannelSettings(true);
                    }}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="flex-1 bg-transparent text-sm outline-none" autoFocus />
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}

            <div className="relative flex flex-1 min-h-0 overflow-hidden">
              {/* Messages */}
              <div className="flex flex-1 min-w-0 flex-col bg-[hsl(var(--muted)/0.15)]">
                <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-8 md:px-14 lg:px-20 sm:py-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <div className="rounded-2xl bg-card/80 backdrop-blur border border-border px-8 py-6 text-center shadow-sm">
                        <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-40" />
                        <p className="text-sm font-semibold">{showSearch ? "No matches found" : "No messages yet"}</p>
                        <p className="text-xs mt-1.5 opacity-60">{showSearch ? "Try a different search term" : `Send the first message in #${activeChannel.name}`}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {filteredMessages.map((msg, idx) => {
                        const isOwn = msg.sender_id === currentUserId;
                        const showDate = shouldShowDate(msg, idx);
                        const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                        const sameAsPrev = !showDate && prevMsg?.sender_id === msg.sender_id && (new Date(msg.created_at).getTime() - new Date(prevMsg!.created_at).getTime() < 120000);
                        const hasAttachment = !!msg.attachment_url;
                        const isImg = isImageType(msg.attachment_type);

                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="rounded-full bg-card/90 backdrop-blur border border-border/50 px-4 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">{formatDateSeparator(msg.created_at)}</span>
                              </div>
                            )}
                            <div className={cn("flex mb-0.5", isOwn ? "justify-end" : "justify-start", !sameAsPrev && "mt-3")}>
                              <div className={cn(
                                "group relative max-w-[85%] sm:max-w-[65%] rounded-2xl shadow-sm transition-shadow hover:shadow-md",
                                isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/60 text-foreground rounded-bl-sm",
                                hasAttachment && !msg.content ? "p-1.5" : "px-3 py-2",
                                msg.is_deleted && "opacity-50"
                              )}>
                                {/* Sender name */}
                                {!isOwn && !sameAsPrev && !msg.is_deleted && (
                                  <p className="text-[11px] font-bold mb-1 text-primary">{msg.sender?.full_name ?? "Unknown"}</p>
                                )}

                                {/* Reply preview */}
                                {msg.reply_to && !msg.is_deleted && (
                                  <div className={cn(
                                    "mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2",
                                    isOwn ? "bg-white/10 border-white/40" : "bg-muted/50 border-primary/40"
                                  )}>
                                    <p className={cn("text-[10px] font-bold", isOwn ? "text-white/80" : "text-primary")}>{msg.reply_to.sender?.full_name ?? "Unknown"}</p>
                                    <p className={cn("text-[11px] truncate", isOwn ? "text-white/60" : "text-muted-foreground")}>{msg.reply_to.content}</p>
                                  </div>
                                )}

                                {/* Attachment */}
                                {hasAttachment && !msg.is_deleted && (
                                  <div className={cn(hasAttachment && msg.content && "mb-1.5", !msg.content && "")}>
                                    {isImg ? (
                                      <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={msg.attachment_url!} alt={msg.attachment_name ?? "image"} className="max-w-full max-h-64 rounded-xl object-cover" />
                                      </a>
                                    ) : (
                                      <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className={cn(
                                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                                        isOwn ? "bg-white/10 hover:bg-white/15" : "bg-muted/50 hover:bg-muted/70"
                                      )}>
                                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isOwn ? "bg-white/15" : "bg-primary/10")}>
                                          <FileText className={cn("h-5 w-5", isOwn ? "text-white" : "text-primary")} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold truncate">{msg.attachment_name}</p>
                                          <p className={cn("text-[10px]", isOwn ? "text-white/50" : "text-muted-foreground")}>{msg.attachment_size ? formatFileSize(msg.attachment_size) : "File"}</p>
                                        </div>
                                        <Download className={cn("h-4 w-4 shrink-0", isOwn ? "text-white/60" : "text-muted-foreground")} />
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Message body */}
                                {editingMsgId === msg.id ? (
                                  <div className="flex items-center gap-1.5 my-1">
                                    <input ref={editInputRef} value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") { setEditingMsgId(null); setEditContent(""); } }}
                                      className="flex-1 min-w-0 rounded-md bg-background/20 px-2 py-1 text-sm outline-none text-inherit" />
                                    <button onClick={handleSaveEdit} className="shrink-0 rounded-md p-1 hover:bg-white/20"><Check className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => { setEditingMsgId(null); setEditContent(""); }} className="shrink-0 rounded-md p-1 hover:bg-white/20"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                ) : msg.is_deleted ? (
                                  <div className="flex items-center gap-1.5 px-1.5"><Ban className="h-3 w-3 opacity-60" /><p className="text-[13px] italic opacity-70 select-none">This message was deleted</p></div>
                                ) : msg.content ? (
                                  <p className="text-[13px] sm:text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                                ) : null}

                                {/* Time footer */}
                                <div className="flex items-center justify-end gap-1 mt-0.5 px-0.5">
                                  {msg.is_edited && !msg.is_deleted && (
                                    <span className={cn("text-[9px]", isOwn ? "text-white/50" : "text-muted-foreground/60")}>
                                      edited
                                    </span>
                                  )}
                                  <span
                                    suppressHydrationWarning
                                    className={cn("text-[10px]", isOwn ? "text-white/50" : "text-muted-foreground/60")}
                                  >
                                    {formatTime(msg.created_at)}
                                  </span>
                                  {isOwn && !msg.is_deleted && <Check className={cn("h-3 w-3", "text-white/50")} />}
                                </div>

                                {/* Hover actions */}
                                {!msg.is_deleted && editingMsgId !== msg.id && (
                                  <div className={cn(
                                    "absolute top-0 flex items-center gap-0.5 rounded-lg bg-card border border-border shadow-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                                    isOwn ? "-left-20" : "-right-20"
                                  )}>
                                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
                                    {isOwn && (
                                      <>
                                        <button onClick={() => handleStartEdit(msg)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => handleDelete(msg.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Reply banner */}
                {replyTo && (
                  <div className="flex items-center gap-3 border-t border-border bg-muted/50 px-4 py-2">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-primary">{replyTo.sender?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{replyTo.content || "Attachment"}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                )}

                {/* Input bar */}
                <div className="bg-muted/40 border-t border-border px-3 py-2.5 sm:px-4 sm:py-3 mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Emoji */}
                    <div className="relative" ref={emojiRef}>
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={cn("shrink-0 rounded-full p-2 transition-colors", showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                        <Smile className="h-5 w-5" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 left-0 z-40 shadow-xl rounded-xl overflow-hidden">
                          <EmojiPicker onEmojiClick={handleEmojiSelect} width={320} height={380} searchPlaceHolder="Search emoji..." previewConfig={{ showPreview: false }} />
                        </div>
                      )}
                    </div>

                    {/* Attachment */}
                    <div className="relative" ref={attachRef}>
                      <button onClick={() => setShowAttachMenu(!showAttachMenu)} className={cn("shrink-0 rounded-full p-2 transition-colors", showAttachMenu ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                        <Plus className="h-5 w-5" />
                      </button>
                      {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 z-40 w-48 rounded-xl bg-card border border-border shadow-xl py-2">
                          <button onClick={() => imageInputRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10"><ImageIcon className="h-4 w-4 text-violet-500" /></div>
                            Photos
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10"><FileText className="h-4 w-4 text-blue-500" /></div>
                            Document
                          </button>
                        </div>
                      )}
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={(e) => handleFileUpload(e, "doc")} />
                    </div>

                    {/* Text input */}
                    <div className="flex flex-1 items-center rounded-full border border-border bg-background px-4 py-2 focus-within:border-primary/50 focus-within:shadow-sm transition-all">
                      <input ref={inputRef} type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message" className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" disabled={sending || uploading} />
                    </div>

                    {/* Send */}
                    <button onClick={handleSend} disabled={sending || (!newMsg.trim()) || uploading} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all", newMsg.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" : "bg-muted text-muted-foreground")}>
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Members panel */}
              {showMembers && (
                <>
                  <div className="absolute inset-0 z-10 bg-black/30 md:hidden" onClick={() => setShowMembers(false)} />
                  <div className="absolute right-0 top-0 bottom-0 z-20 w-72 border-l border-border overflow-y-auto bg-card p-4 shadow-lg md:static md:z-auto md:w-64 md:shrink-0 md:shadow-none">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Members ({members.length})</h4>
                      <button onClick={() => setShowMembers(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground md:hidden"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-1">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                          <div className="relative">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary overflow-hidden">
                              {m.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                              ) : getInitials(m.full_name)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {m.full_name}{m.id === currentUserId && <span className="ml-1 text-muted-foreground text-xs">(you)</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize">{m.role.replace("_", " ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted/10 p-6">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/5">
                <MessageSquare className="h-12 w-12 text-primary/30" />
              </div>
              <p className="text-xl font-bold text-foreground">Team Chat</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">Select a channel to start messaging your team. Send texts, images, and documents.</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Dialogs ═══ */}

      {/* Create channel */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl sm:max-w-md border border-border bg-card p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Create Channel</h3>
              <button onClick={() => { setShowNewChannel(false); setCreateError(null); }} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {createError && <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{createError}</div>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel Name</label>
                <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="e.g. sales-team" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <input value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} placeholder="What's this channel about?" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Add Members</label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-0.5">
                  {allUsers.filter((u) => u.is_active && u.id !== currentUserId).map((u) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors">
                      <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", selectedMembers.includes(u.id) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {selectedMembers.includes(u.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate flex-1">{u.full_name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize shrink-0">{u.role.replace("_", " ")}</span>
                      <input type="checkbox" className="hidden" checked={selectedMembers.includes(u.id)} onChange={(e) => setSelectedMembers((prev) => e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => { setShowNewChannel(false); setCreateError(null); }} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={handleCreateChannel} disabled={creatingChannel || !newChannelName.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{creatingChannel ? "Creating..." : "Create Channel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel settings (admin) */}
      {showChannelSettings && activeChannel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl sm:max-w-md border border-border bg-card p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Channel Settings</h3>
              <button onClick={() => setShowChannelSettings(false)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {channelActionError && (
              <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {channelActionError}
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center mb-5">
              <label className="group relative cursor-pointer">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                  {activeChannel.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeChannel.avatar_url} alt={activeChannel.name} className="h-full w-full object-cover" />
                  ) : (
                    <Hash className="h-8 w-8" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleChannelAvatarUpload} />
              </label>
              <p className="text-[11px] text-muted-foreground mt-2">Click to change avatar</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel Name</label>
                <input
                  value={editChName}
                  onChange={(e) => setEditChName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <input
                  value={editChDesc}
                  onChange={(e) => setEditChDesc(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel Members</label>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-0.5">
                  {allUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          settingsMembers.includes(u.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {settingsMembers.includes(u.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate flex-1">{u.full_name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                        {u.role.replace("_", " ")}
                      </span>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={settingsMembers.includes(u.id)}
                        onChange={(e) =>
                          setSettingsMembers((prev) =>
                            e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button onClick={handleSaveChannelSettings} disabled={savingChannel || !editChName.trim()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {savingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{savingChannel ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleClearChat} className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2 transition-colors">
                <Trash2 className="h-4 w-4" /> Clear All Messages
              </button>
              <button
                onClick={handleDeleteChannel}
                className="w-full rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
