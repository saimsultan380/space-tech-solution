"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  getChannelMessages,
  getChannelMembers,
  createChannel,
  createDirectMessage,
  updateChannel,
  clearChannelMessages,
  deleteChannel,
  setChannelMembers,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  type ChatChannel,
  type ChatMessage,
} from "@/lib/actions/chat";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Hash,
  Send,
  Users,
  Plus,
  Loader2,
  X,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronDown,
  Smile,
  Pencil,
  Trash2,
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
  Pin,
  PinOff,
  Bell,
  Link2,
  Mic,
  Globe,
  MessageCircle,
  UserPlus,
  PanelRightOpen,
  PanelRightClose,
  CircleDot,
  Clock,
  EyeOff,
  MinusCircle,
  LayoutDashboard,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

/* ─── Types ─── */

type PresenceStatus = "online" | "away" | "dnd" | "invisible";
type ActiveTab = "chat" | "files" | "photos" | "links";
type Member = { id: string; full_name: string; avatar_url: string | null; role: string; is_active?: boolean };

interface ChatClientProps {
  channels: ChatChannel[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  currentUserAvatar?: string | null;
  allUsers?: (Member & { is_active: boolean })[];
}

const PRESENCE_META: Record<PresenceStatus, { label: string; color: string; icon: React.ElementType }> = {
  online: { label: "Online", color: "bg-emerald-500", icon: CircleDot },
  away: { label: "Away", color: "bg-amber-500", icon: Clock },
  dnd: { label: "Do Not Disturb", color: "bg-red-500", icon: MinusCircle },
  invisible: { label: "Invisible", color: "bg-gray-400", icon: EyeOff },
};

/* ─── Component ─── */

export function ChatClient(props: ChatClientProps) {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ChatClientContent {...props} />
    </Suspense>
  );
}

function ChatClientContent({
  channels: initialChannels,
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserAvatar,
  allUsers = [],
}: ChatClientProps) {
  const searchParams = useSearchParams();
  const urlChannelId = searchParams.get("channelId");

  // ─── State ───
  const [channels, setChannels] = useState(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>((urlChannelId || initialChannels[0]?.id) ?? null);
  
  useEffect(() => {
    if (urlChannelId && urlChannelId !== activeChannelId) {
      setActiveChannelId(urlChannelId);
      setMobileShowChat(true);
      
      // If the channel is not in our list, we might need to fetch it
      if (!channels.some(c => c.id === urlChannelId)) {
        const fetchNewChannel = async () => {
          const supabase = createClient();
          const { data } = await supabase
            .from("chat_channels")
            .select("*")
            .eq("id", urlChannelId)
            .single();
          
          if (data) {
            // This is a bit simplified, but helps show the new DM immediately
            setChannels(prev => [data as ChatChannel, ...prev]);
          }
        };
        fetchNewChannel();
      }
    }
  }, [urlChannelId, channels]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // UI panels
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Create channel dialog
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // New DM
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);

  // Message actions
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Channel settings
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [editChName, setEditChName] = useState("");
  const [editChDesc, setEditChDesc] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [settingsMembers, setSettingsMembers] = useState<string[]>([]);
  const [channelActionError, setChannelActionError] = useState<string | null>(null);

  // Pinned
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showAllPinned, setShowAllPinned] = useState(false);

  // Presence & typing
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [myPresence, setMyPresence] = useState<PresenceStatus>("online");
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Attachment / uploading
  const [uploading, setUploading] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ─── Derived ───

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const regularChannels = channels.filter((c) => !c.is_direct);
  const dmChannels = channels.filter((c) => c.is_direct);

  const filteredRegularChannels = sidebarSearch
    ? regularChannels.filter((c) => c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : regularChannels;
  const filteredDmChannels = sidebarSearch
    ? dmChannels.filter((c) => {
        const name = c.dm_partner?.full_name ?? c.name;
        return name.toLowerCase().includes(sidebarSearch.toLowerCase());
      })
    : dmChannels;

  const filteredMessages = showSearch && searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const fileMessages = messages.filter((m) => m.attachment_url && !m.is_deleted && !m.attachment_type?.startsWith("image/"));
  const photoMessages = messages.filter((m) => m.attachment_url && !m.is_deleted && m.attachment_type?.startsWith("image/"));
  const linkMessages = messages.filter((m) => !m.is_deleted && m.content && /https?:\/\/[^\s]+/.test(m.content));

  const channelTypingUsers = Object.entries(typingUsers)
    .filter(([uid]) => uid !== currentUserId)
    .map(([, name]) => name);

  // ─── Effects ───

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttachMenu(false);
      setMenuMsgId(null);
      setShowPresenceMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load messages + members + pinned when channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;
    async function load() {
      setLoadingMsgs(true);
      setActiveTab("chat");
      const [msgs, mems, pinned] = await Promise.all([
        getChannelMessages(activeChannelId!),
        getChannelMembers(activeChannelId!),
        getPinnedMessages(activeChannelId!),
      ]);
      if (!cancelled) {
        setMessages(msgs);
        setMembers(mems as Member[]);
        setPinnedMessages(pinned);
        setLoadingMsgs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeChannelId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [newMsg]);

  // Realtime subscription for active channel
  useEffect(() => {
    if (!activeChannelId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${activeChannelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        const msg = payload.new as ChatMessage;
        const sender = allUsers.find((u) => u.id === msg.sender_id) || members.find((m) => m.id === msg.sender_id);
        if (sender) msg.sender = { id: sender.id, full_name: sender.full_name, avatar_url: sender.avatar_url, role: sender.role };

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.id.startsWith("optimistic-") && m.sender_id === msg.sender_id && m.content === msg.content))) {
            return prev.map((m) =>
              m.id.startsWith("optimistic-") && m.sender_id === msg.sender_id && m.content === msg.content
                ? { ...msg, sender: msg.sender }
                : m,
            );
          }
          return [...prev, msg];
        });

        setChannels((prev) => {
          const idx = prev.findIndex((c) => c.id === msg.channel_id);
          if (idx === -1) return prev;
          const updated: ChatChannel = {
            ...prev[idx],
            last_message: { content: msg.content || (msg.attachment_name ?? "Attachment"), sender_name: msg.sender?.full_name ?? "", created_at: msg.created_at },
          };
          const rest = [...prev];
          rest.splice(idx, 1);
          return [updated, ...rest];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id !== updated.id ? m : { ...m, content: updated.content, is_edited: updated.is_edited, is_deleted: updated.is_deleted, is_pinned: updated.is_pinned ?? m.is_pinned, updated_at: updated.updated_at }));
        if (updated.is_pinned !== undefined) {
          setPinnedMessages((prev) => {
            if (updated.is_pinned && !updated.is_deleted) {
              if (!prev.some((p) => p.id === updated.id)) return [{ ...updated } as ChatMessage, ...prev];
              return prev;
            }
            return prev.filter((p) => p.id !== updated.id);
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannelId, allUsers, members]);

  // Global realtime for unread counts on non-active channels
  useEffect(() => {
    const supabase = createClient();
    const globalChannel = supabase
      .channel("chat:global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender_id !== currentUserId && msg.channel_id !== activeChannelId) {
          const isMyChannel = channels.some((c) => c.id === msg.channel_id);
          if (isMyChannel) {
            setUnreadCounts((prev) => ({ ...prev, [msg.channel_id]: (prev[msg.channel_id] ?? 0) + 1 }));
            const sender = allUsers.find((u) => u.id === msg.sender_id);
            setChannels((prev) => {
              const idx = prev.findIndex((c) => c.id === msg.channel_id);
              if (idx === -1) return prev;
              const updated: ChatChannel = {
                ...prev[idx],
                last_message: { content: msg.content || "Attachment", sender_name: sender?.full_name ?? "", created_at: msg.created_at },
              };
              const rest = [...prev];
              rest.splice(idx, 1);
              return [updated, ...rest];
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, [activeChannelId, currentUserId, channels, allUsers]);

  // Presence & typing via Supabase Realtime Presence + Broadcast
  useEffect(() => {
    const supabase = createClient();
    const presenceCh = supabase.channel("presence:chat", { config: { presence: { key: currentUserId } } });

    presenceCh
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState();
        const ids = new Set<string>();
        for (const key of Object.keys(state)) ids.add(key);
        setOnlineUsers(ids);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === currentUserId || payload.channel_id !== activeChannelId) return;
        setTypingUsers((prev) => ({ ...prev, [payload.user_id]: payload.user_name }));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[payload.user_id];
            return next;
          });
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceCh.track({ user_id: currentUserId, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = presenceCh;
    return () => { supabase.removeChannel(presenceCh); };
  }, [currentUserId, activeChannelId]);

  // ─── Handlers ───

  const broadcastTyping = useCallback(() => {
    if (!activeChannelId || !presenceChannelRef.current) return;
    presenceChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, user_name: currentUserName, channel_id: activeChannelId },
    });
  }, [activeChannelId, currentUserId, currentUserName]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastTyping();
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeChannelId || sending) return;
    const content = newMsg;
    const replyId = replyTo?.id;
    setNewMsg("");
    setReplyTo(null);
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      channel_id: activeChannelId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      is_edited: false, is_deleted: false, is_pinned: false, updated_at: null,
      attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null,
      reply_to_id: replyId ?? null,
      reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, sender_id: replyTo.sender_id, sender: replyTo.sender ? { full_name: replyTo.sender.full_name } : null } : null,
      sender: { id: currentUserId, full_name: currentUserName, avatar_url: currentUserAvatar ?? null, role: currentUserRole },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    await sendMessage(activeChannelId, content, { replyToId: replyId });
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (file: File) => {
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

      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        channel_id: activeChannelId, sender_id: currentUserId, content: "",
        created_at: new Date().toISOString(), is_edited: false, is_deleted: false, is_pinned: false, updated_at: null,
        attachment_url: urlData.publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
        reply_to_id: null, reply_to: null,
        sender: { id: currentUserId, full_name: currentUserName, avatar_url: currentUserAvatar ?? null, role: currentUserRole },
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      await sendMessage(activeChannelId, "", {
        attachmentUrl: urlData.publicUrl, attachmentName: file.name, attachmentType: file.type, attachmentSize: file.size,
      });
    } catch { /* silently handle */ } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
    setMobileShowChat(true);
    setShowMemberPanel(false);
    setMenuMsgId(null);
    setShowSearch(false);
    setReplyTo(null);
    setActiveTab("chat");
    setTypingUsers({});
  };

  const handleMobileBack = () => { setMobileShowChat(false); setShowMemberPanel(false); setShowSearch(false); };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    setCreateError(null);
    const result = await createChannel(newChannelName, newChannelDesc, selectedMembers);
    if (result.error) { setCreateError(result.error); setCreatingChannel(false); return; }
    if (result.channelId) {
      setShowNewChannel(false);
      setNewChannelName(""); setNewChannelDesc(""); setSelectedMembers([]);
      window.location.reload();
    }
    setCreatingChannel(false);
  };

  const handleStartDM = async (userId: string) => {
    setCreatingDM(true);
    const result = await createDirectMessage(userId);
    setCreatingDM(false);
    if (result.error) return;
    if (result.channelId) {
      setShowNewDM(false);
      setDmSearchQuery("");
      const existing = channels.find((c) => c.id === result.channelId);
      if (existing) {
        handleSelectChannel(result.channelId);
      } else {
        window.location.reload();
      }
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id); setEditContent(msg.content); setMenuMsgId(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

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

  const handlePin = async (msg: ChatMessage) => {
    setMenuMsgId(null);
    if (msg.is_pinned) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_pinned: false } : m));
      setPinnedMessages((prev) => prev.filter((p) => p.id !== msg.id));
      await unpinMessage(msg.id);
    } else {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_pinned: true } : m));
      setPinnedMessages((prev) => [msg, ...prev]);
      await pinMessage(msg.id);
    }
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    setNewMsg((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSaveChannelSettings = async () => {
    if (!activeChannelId) return;
    setSavingChannel(true);
    await updateChannel(activeChannelId, { name: editChName, description: editChDesc });
    const result = await setChannelMembers(activeChannelId, settingsMembers);
    if (!result.error) {
      setChannels((prev) => prev.map((c) => c.id === activeChannelId ? { ...c, name: editChName, description: editChDesc } : c));
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
    setPinnedMessages([]);
  };

  const handleDeleteChannel = async () => {
    if (!activeChannelId || !activeChannel) return;
    if (!confirm(`Delete channel "${activeChannel.name}" and all its messages for everyone? This cannot be undone.`)) return;
    setSavingChannel(true); setChannelActionError(null);
    const result = await deleteChannel(activeChannelId);
    setSavingChannel(false);
    if (result.error) { setChannelActionError(result.error); return; }
    setChannels((prev) => prev.filter((c) => c.id !== activeChannelId));
    setActiveChannelId(null); setMessages([]); setMembers([]); setShowChannelSettings(false);
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

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await handleFileUpload(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch { /* mic not available */ }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ─── Helpers ───

  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatTime = (d: string) => timeFormatter.format(new Date(d));

  const formatDateSeparator = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (date.toDateString() === y.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  };

  const formatRelativeTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return formatTime(d);
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (date.toDateString() === y.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
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

  const extractLinks = (text: string) => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  };

  const getDmDisplayName = (ch: ChatChannel) => ch.dm_partner?.full_name ?? ch.name;
  const getDmAvatar = (ch: ChatChannel) => ch.dm_partner?.avatar_url ?? null;
  const isDmOnline = (ch: ChatChannel) => ch.dm_partner ? onlineUsers.has(ch.dm_partner.id) : false;

  // ─── Render ───

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ═══════════════════════════════ LEFT SIDEBAR ═══════════════════════════════ */}
      <div className={cn("flex w-full flex-col border-r border-border bg-card md:w-[320px] md:shrink-0", mobileShowChat && "hidden md:flex")}>

        {/* User header */}
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold overflow-hidden">
                {currentUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
                ) : getInitials(currentUserName)}
              </div>
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", PRESENCE_META[myPresence].color)} />
            </div>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowPresenceMenu((p) => !p); }}
                className="text-left"
              >
                <h2 className="text-sm font-bold text-foreground leading-tight">{currentUserName}</h2>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", PRESENCE_META[myPresence].color)} />
                  {PRESENCE_META[myPresence].label}
                  <ChevronDown className="h-3 w-3" />
                </p>
              </button>
              {showPresenceMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl glass shadow-xl py-1.5" onClick={(e) => e.stopPropagation()}>
                  {(Object.entries(PRESENCE_META) as [PresenceStatus, typeof PRESENCE_META["online"]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => { setMyPresence(key); setShowPresenceMenu(false); }}
                      className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors", myPresence === key && "bg-muted/50")}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", meta.color)} />
                      {meta.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Back to Dashboard"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
            <button className="relative rounded-full p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Notifications">
              <Bell className="h-5 w-5" />
              {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-card" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search channels & people..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channel & DM list */}
        <div className="flex-1 overflow-y-auto">

          {/* Channels section */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Channels</h3>
            {currentUserRole === "super_admin" && (
              <button onClick={() => { setShowNewChannel(true); setCreateError(null); }} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="New channel">
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredRegularChannels.map((ch) => (
            <SidebarItem
              key={ch.id}
              isActive={activeChannelId === ch.id}
              unread={unreadCounts[ch.id] ?? 0}
              onClick={() => handleSelectChannel(ch.id)}
              avatar={ch.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ch.avatar_url} alt={ch.name} className="h-full w-full object-cover" />
              ) : <Hash className="h-5 w-5" />}
              name={ch.name}
              subtitle={ch.last_message ? `${ch.last_message.sender_name}: ${ch.last_message.content || "Attachment"}` : "No messages yet"}
              time={ch.last_message ? formatRelativeTime(ch.last_message.created_at) : undefined}
              isSubtitleItalic={!ch.last_message}
            />
          ))}

          {filteredRegularChannels.length === 0 && !sidebarSearch && (
            <p className="px-4 py-3 text-xs text-muted-foreground/50 italic">No channels</p>
          )}

          {/* Direct Messages section */}
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Direct Messages</h3>
            <button onClick={() => { setShowNewDM(true); setDmSearchQuery(""); }} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="New message">
              <UserPlus className="h-4 w-4" />
            </button>
          </div>

          {filteredDmChannels.map((ch) => {
            const dmName = getDmDisplayName(ch);
            const dmAv = getDmAvatar(ch);
            const online = isDmOnline(ch);
            return (
              <SidebarItem
                key={ch.id}
                isActive={activeChannelId === ch.id}
                unread={unreadCounts[ch.id] ?? 0}
                onClick={() => handleSelectChannel(ch.id)}
                avatar={dmAv ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dmAv} alt={dmName} className="h-full w-full object-cover" />
                ) : <span className="text-xs font-bold">{getInitials(dmName)}</span>}
                name={dmName}
                subtitle={ch.last_message ? (ch.last_message.content || "Attachment") : "Start a conversation"}
                time={ch.last_message ? formatRelativeTime(ch.last_message.created_at) : undefined}
                isSubtitleItalic={!ch.last_message}
                presenceDot={online ? "online" : "offline"}
              />
            );
          })}

          {filteredDmChannels.length === 0 && !sidebarSearch && (
            <p className="px-4 py-3 text-xs text-muted-foreground/50 italic">No conversations yet</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════ CENTER — CHAT AREA ═══════════════════════════════ */}
      <div className={cn("flex flex-1 min-w-0 flex-col bg-background", !mobileShowChat && "hidden md:flex")}>
        {activeChannel ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 bg-muted/40 border-b border-border px-3 py-2.5 sm:px-4">
              <button onClick={handleMobileBack} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"><ChevronLeft className="h-5 w-5" /></button>
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                {activeChannel.is_direct && activeChannel.dm_partner?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeChannel.dm_partner.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : activeChannel.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeChannel.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : activeChannel.is_direct ? (
                  <span className="text-xs font-bold">{getInitials(getDmDisplayName(activeChannel))}</span>
                ) : (
                  <Hash className="h-5 w-5" />
                )}
                {activeChannel.is_direct && isDmOnline(activeChannel) && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-muted/40 presence-online" />
                )}
              </div>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { if (currentUserRole === "super_admin" && !activeChannel.is_direct) { setEditChName(activeChannel.name); setEditChDesc(activeChannel.description); setSettingsMembers(members.map((m) => m.id)); setShowChannelSettings(true); } }}>
                <h3 className="text-sm font-bold text-foreground truncate">
                  {activeChannel.is_direct ? getDmDisplayName(activeChannel) : activeChannel.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {activeChannel.is_direct
                    ? (isDmOnline(activeChannel) ? "Online" : "Offline")
                    : `${members.length} members`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
                  title="Back to Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
                <button onClick={() => setShowSearch(!showSearch)} className={cn("shrink-0 rounded-full p-2 transition-colors", showSearch ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <Search className="h-4 w-4" />
                </button>
                <button onClick={() => setShowMemberPanel(!showMemberPanel)} className={cn("shrink-0 rounded-full p-2 transition-colors", showMemberPanel ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  {showMemberPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </button>
                {currentUserRole === "super_admin" && !activeChannel.is_direct && (
                  <button onClick={() => { setEditChName(activeChannel.name); setEditChDesc(activeChannel.description); setSettingsMembers(members.map((m) => m.id)); setShowChannelSettings(true); }} className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 animate-slide-down">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="flex-1 bg-transparent text-sm outline-none" autoFocus />
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-3 sm:px-4">
              {(["chat", "files", "photos", "links"] as ActiveTab[]).map((tab) => {
                const icons: Record<ActiveTab, React.ElementType> = { chat: MessageSquare, files: FileText, photos: ImageIcon, links: Link2 };
                const Icon = icons[tab];
                const count = tab === "files" ? fileMessages.length : tab === "photos" ? photoMessages.length : tab === "links" ? linkMessages.length : 0;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold capitalize transition-all rounded-t-lg",
                      activeTab === tab ? "chat-tab-active shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab}
                    {count > 0 && tab !== "chat" && (
                      <span className={cn("ml-0.5 text-[10px] rounded-full px-1.5 py-0.5", activeTab === tab ? "bg-white/20" : "bg-muted")}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative flex flex-1 min-h-0 overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-30 flex items-center justify-center drag-overlay rounded-lg m-2 pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Paperclip className="h-12 w-12 opacity-60" />
                    <p className="text-sm font-semibold">Drop file to send</p>
                  </div>
                </div>
              )}

              {/* Chat tab */}
              {activeTab === "chat" && (
                <div className="flex flex-1 min-w-0 flex-col bg-background">
                  {/* Pinned messages banner */}
                  {pinnedMessages.length > 0 && (
                    <div className="flex items-center gap-2 border-b border-border/50 bg-amber-500/5 px-4 py-2 cursor-pointer hover:bg-amber-500/10 transition-colors" onClick={() => setShowAllPinned(true)}>
                      <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <p className="text-xs text-foreground truncate flex-1">
                        <span className="font-semibold">{pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground ml-2">{pinnedMessages[0]?.content?.slice(0, 50)}</span>
                      </p>
                      <span className="text-[10px] text-primary font-semibold shrink-0">See all</span>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 md:px-10 lg:px-16 sm:py-4">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="rounded-2xl glass px-8 py-6 text-center shadow-sm">
                          <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-40" />
                          <p className="text-sm font-semibold">{showSearch ? "No matches found" : "No messages yet"}</p>
                          <p className="text-xs mt-1.5 opacity-60">{showSearch ? "Try a different search term" : `Send the first message in ${activeChannel.is_direct ? "this conversation" : "#" + activeChannel.name}`}</p>
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
                            <div key={msg.id} className="msg-animate">
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <span className="rounded-full glass px-4 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">{formatDateSeparator(msg.created_at)}</span>
                                </div>
                              )}
                              <div className={cn("flex mb-0.5", isOwn ? "justify-end" : "justify-start", !sameAsPrev && "mt-3")}>
                                {/* Avatar for others */}
                                {!isOwn && !sameAsPrev && (
                                  <div className="relative mr-2 mt-1 shrink-0">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary overflow-hidden">
                                      {msg.sender?.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={msg.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                                      ) : getInitials(msg.sender?.full_name ?? "?")}
                                    </div>
                                    {onlineUsers.has(msg.sender_id) && (
                                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-[1.5px] border-background" />
                                    )}
                                  </div>
                                )}
                                {!isOwn && sameAsPrev && <div className="w-10 shrink-0" />}

                                <div className={cn(
                                  "group relative max-w-[80%] sm:max-w-[60%] rounded-2xl shadow-sm transition-shadow hover:shadow-md",
                                  isOwn ? "chat-bubble-user bg-primary text-primary-foreground rounded-br-sm" : "chat-bubble-bot bg-card border border-border/60 text-foreground rounded-bl-sm",
                                  hasAttachment && !msg.content ? "p-1.5" : "px-3 py-2",
                                  msg.is_deleted && "opacity-50",
                                )}>
                                  {/* Sender name */}
                                  {!isOwn && !sameAsPrev && !msg.is_deleted && (
                                    <p className="text-[11px] font-bold mb-1 text-primary">{msg.sender?.full_name ?? "Unknown"}</p>
                                  )}

                                  {/* Reply preview */}
                                  {msg.reply_to && !msg.is_deleted && (
                                    <div className={cn("mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2", isOwn ? "bg-white/10 border-white/40" : "bg-muted/50 border-primary/40")}>
                                      <p className={cn("text-[10px] font-bold", isOwn ? "text-white/80" : "text-primary")}>{msg.reply_to.sender?.full_name ?? "Unknown"}</p>
                                      <p className={cn("text-[11px] truncate", isOwn ? "text-white/60" : "text-muted-foreground")}>{msg.reply_to.content}</p>
                                    </div>
                                  )}

                                  {/* Pinned indicator */}
                                  {msg.is_pinned && !msg.is_deleted && (
                                    <div className={cn("flex items-center gap-1 mb-1", isOwn ? "text-white/50" : "text-amber-500/70")}>
                                      <Pin className="h-2.5 w-2.5" />
                                      <span className="text-[9px] font-medium">Pinned</span>
                                    </div>
                                  )}

                                  {/* Attachment */}
                                  {hasAttachment && !msg.is_deleted && (
                                    <div className={cn(hasAttachment && msg.content && "mb-1.5")}>
                                      {isImg ? (
                                        <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="block">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={msg.attachment_url!} alt={msg.attachment_name ?? "image"} className="max-w-full max-h-64 rounded-xl object-cover" />
                                        </a>
                                      ) : msg.attachment_type?.startsWith("audio/") ? (
                                        <div className={cn("rounded-xl px-3 py-2", isOwn ? "bg-white/10" : "bg-muted/50")}>
                                          <audio controls src={msg.attachment_url!} className="h-8 w-full max-w-[240px]" />
                                        </div>
                                      ) : (
                                        <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors", isOwn ? "bg-white/10 hover:bg-white/15" : "bg-muted/50 hover:bg-muted/70")}>
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

                                  {/* Time + read receipts */}
                                  <div className="flex items-center justify-end gap-1 mt-0.5 px-0.5">
                                    {msg.is_edited && !msg.is_deleted && (
                                      <span className={cn("text-[9px]", isOwn ? "text-white/50" : "text-muted-foreground/60")}>edited</span>
                                    )}
                                    <span suppressHydrationWarning className={cn("text-[10px]", isOwn ? "text-white/50" : "text-muted-foreground/60")}>{formatTime(msg.created_at)}</span>
                                    {isOwn && !msg.is_deleted && (
                                      <CheckCheck className={cn("h-3.5 w-3.5", "text-white/50")} />
                                    )}
                                  </div>

                                  {/* Hover action toolbar */}
                                  {!msg.is_deleted && editingMsgId !== msg.id && (
                                    <div className={cn(
                                      "absolute -top-3 flex items-center gap-0.5 rounded-lg glass shadow-md p-0.5 opacity-0 group-hover:opacity-100 transition-all z-10",
                                      isOwn ? "right-2" : "left-2",
                                    )}>
                                      <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => handlePin(msg)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title={msg.is_pinned ? "Unpin" : "Pin"}>
                                        {msg.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                      </button>
                                      {isOwn && (
                                        <>
                                          <button onClick={() => handleStartEdit(msg)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                          <button onClick={() => handleDelete(msg.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
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

                  {/* Typing indicator */}
                  {channelTypingUsers.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5 border-t border-border/30">
                      <div className="flex gap-0.5">
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">{channelTypingUsers.join(", ")}</span> {channelTypingUsers.length === 1 ? "is" : "are"} typing...
                      </p>
                    </div>
                  )}

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
                  <div className="bg-muted/40 border-t border-border px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-end gap-1.5 sm:gap-2">
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
                          <Paperclip className="h-5 w-5" />
                        </button>
                        {showAttachMenu && (
                          <div className="absolute bottom-12 left-0 z-40 w-48 rounded-xl glass shadow-xl py-2">
                            <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-foreground">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10"><ImageIcon className="h-4 w-4 text-violet-500" /></div>
                              Photos
                            </button>
                            <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-foreground">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
                              Document
                            </button>
                          </div>
                        )}
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" className="hidden" onChange={handleFileInputChange} />
                      </div>

                      {/* Text input */}
                      <div className="flex flex-1 items-end rounded-2xl border border-border bg-background px-4 py-2 focus-within:border-primary/50 focus-within:shadow-sm transition-all">
                        <textarea
                          ref={inputRef}
                          value={newMsg}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a message"
                          className="flex-1 min-w-0 bg-transparent text-sm outline-none resize-none max-h-[120px] leading-relaxed placeholder:text-muted-foreground/50"
                          rows={1}
                          disabled={sending || uploading}
                        />
                      </div>

                      {/* Voice / Send */}
                      {newMsg.trim() ? (
                        <button onClick={handleSend} disabled={sending || uploading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all">
                          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                      ) : (
                        <button
                          onMouseDown={handleStartRecording}
                          onMouseUp={handleStopRecording}
                          onMouseLeave={handleStopRecording}
                          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all", isRecording ? "bg-red-500 text-white scale-110 shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                          title="Hold to record"
                        >
                          <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Files tab */}
              {activeTab === "files" && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 tab-content-animate">
                  {fileMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No files shared</p>
                      <p className="text-xs mt-1 opacity-60">Files shared in this conversation will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fileMessages.map((msg) => (
                        <a key={msg.id} href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{msg.attachment_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {msg.sender?.full_name} &middot; {formatRelativeTime(msg.created_at)}
                              {msg.attachment_size ? ` · ${formatFileSize(msg.attachment_size)}` : ""}
                            </p>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Photos tab */}
              {activeTab === "photos" && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 tab-content-animate">
                  {photoMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No photos shared</p>
                      <p className="text-xs mt-1 opacity-60">Photos shared in this conversation will appear here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {photoMessages.map((msg) => (
                        <a key={msg.id} href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.attachment_url!} alt={msg.attachment_name ?? ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <p className="text-[10px] text-white truncate">{msg.sender?.full_name} &middot; {formatRelativeTime(msg.created_at)}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Links tab */}
              {activeTab === "links" && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 tab-content-animate">
                  {linkMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Link2 className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No links shared</p>
                      <p className="text-xs mt-1 opacity-60">Links shared in this conversation will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkMessages.map((msg) => {
                        const urls = extractLinks(msg.content);
                        return urls.map((url, i) => (
                          <a key={`${msg.id}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-primary truncate">{url}</p>
                              <p className="text-[11px] text-muted-foreground">{msg.sender?.full_name} &middot; {formatRelativeTime(msg.created_at)}</p>
                            </div>
                          </a>
                        ));
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Right member panel ═══ */}
              {showMemberPanel && (
                <>
                  <div className="absolute inset-0 z-10 bg-black/30 md:hidden" onClick={() => setShowMemberPanel(false)} />
                  <div className="absolute right-0 top-0 bottom-0 z-20 w-80 border-l border-border overflow-y-auto bg-card shadow-lg md:static md:z-auto md:w-72 md:shrink-0 md:shadow-none panel-slide-in">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h4 className="text-sm font-bold text-foreground">
                        {activeChannel.is_direct ? "Conversation Info" : "Channel Info"}
                      </h4>
                      <button onClick={() => setShowMemberPanel(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Description */}
                    {activeChannel.description && !activeChannel.is_direct && (
                      <div className="px-4 py-3 border-b border-border/50">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Description</h5>
                        <p className="text-xs text-muted-foreground">{activeChannel.description}</p>
                      </div>
                    )}

                    {/* Members */}
                    <div className="px-4 py-3 border-b border-border/50">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Members ({members.length})</h5>
                      <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                            <div className="relative shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary overflow-hidden">
                                {m.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                                ) : getInitials(m.full_name)}
                              </div>
                              <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-card", onlineUsers.has(m.id) ? "bg-emerald-500" : "bg-gray-400")} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {m.full_name}{m.id === currentUserId && <span className="ml-1 text-muted-foreground text-[10px]">(you)</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground capitalize">{m.role.replace("_", " ")}</p>
                            </div>
                            <span className={cn("ml-auto text-[9px] font-medium", onlineUsers.has(m.id) ? "text-emerald-500" : "text-muted-foreground/50")}>
                              {onlineUsers.has(m.id) ? "Online" : "Offline"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shared media strip */}
                    {photoMessages.length > 0 && (
                      <div className="px-4 py-3 border-b border-border/50">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Shared Media</h5>
                        <div className="grid grid-cols-4 gap-1.5">
                          {photoMessages.slice(0, 8).map((m) => (
                            <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.attachment_url!} alt="" className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                        {photoMessages.length > 8 && (
                          <button onClick={() => setActiveTab("photos")} className="text-[11px] text-primary font-semibold mt-2">See all {photoMessages.length} photos</button>
                        )}
                      </div>
                    )}

                    {/* Pinned messages */}
                    {pinnedMessages.length > 0 && (
                      <div className="px-4 py-3">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Pinned Messages ({pinnedMessages.length})</h5>
                        <div className="space-y-1.5">
                          {pinnedMessages.slice(0, 5).map((pm) => (
                            <div key={pm.id} className="rounded-lg bg-muted/50 px-3 py-2 border-l-2 border-amber-500">
                              <p className="text-[10px] font-bold text-foreground">{pm.sender?.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{pm.content || "Attachment"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">Select a channel or start a direct message to begin chatting with your team.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════ DIALOGS ═══════════════════════════════ */}

      {/* Create channel */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md glass p-5 sm:p-6 shadow-2xl">
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
              <button onClick={handleCreateChannel} disabled={creatingChannel || !newChannelName.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{creatingChannel ? "Creating..." : "Create Channel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New DM modal */}
      {showNewDM && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md glass p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">New Message</h3>
              <button onClick={() => setShowNewDM(false)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input value={dmSearchQuery} onChange={(e) => setDmSearchQuery(e.target.value)} placeholder="Search people..." className="flex-1 bg-transparent text-sm outline-none" autoFocus />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {allUsers
                .filter((u) => u.is_active && u.id !== currentUserId)
                .filter((u) => !dmSearchQuery || u.full_name.toLowerCase().includes(dmSearchQuery.toLowerCase()))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDM(u.id)}
                    disabled={creatingDM}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary overflow-hidden">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt={u.full_name} className="h-full w-full object-cover" />
                        ) : getInitials(u.full_name)}
                      </div>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", onlineUsers.has(u.id) ? "bg-emerald-500" : "bg-gray-400")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{u.role.replace("_", " ")}</p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Channel settings (admin) */}
      {showChannelSettings && activeChannel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md glass p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Channel Settings</h3>
              <button onClick={() => setShowChannelSettings(false)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {channelActionError && (
              <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{channelActionError}</div>
            )}
            <div className="flex flex-col items-center mb-5">
              <label className="group relative cursor-pointer">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                  {activeChannel.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeChannel.avatar_url} alt={activeChannel.name} className="h-full w-full object-cover" />
                  ) : <Hash className="h-8 w-8" />}
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
                <input value={editChName} onChange={(e) => setEditChName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <input value={editChDesc} onChange={(e) => setEditChDesc(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel Members</label>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-0.5">
                  {allUsers.map((u) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                      <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", settingsMembers.includes(u.id) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {settingsMembers.includes(u.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate flex-1">{u.full_name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize shrink-0">{u.role.replace("_", " ")}</span>
                      <input type="checkbox" className="hidden" checked={settingsMembers.includes(u.id)} onChange={(e) => setSettingsMembers((prev) => e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <button onClick={handleSaveChannelSettings} disabled={savingChannel || !editChName.trim()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2">
                {savingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{savingChannel ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleClearChat} className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2 transition-colors">
                <Trash2 className="h-4 w-4" /> Clear All Messages
              </button>
              <button onClick={handleDeleteChannel} className="w-full rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2 transition-colors">
                <Trash2 className="h-4 w-4" /> Delete Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned messages panel */}
      {showAllPinned && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md glass p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2"><Pin className="h-4 w-4 text-amber-500" /> Pinned Messages</h3>
              <button onClick={() => setShowAllPinned(false)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {pinnedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pinned messages</p>
            ) : (
              <div className="space-y-2">
                {pinnedMessages.map((pm) => (
                  <div key={pm.id} className="rounded-xl bg-card border border-border p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary overflow-hidden">
                        {pm.sender?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pm.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : getInitials(pm.sender?.full_name ?? "?")}
                      </div>
                      <span className="text-xs font-semibold">{pm.sender?.full_name}</span>
                      <span suppressHydrationWarning className="text-[10px] text-muted-foreground ml-auto">{formatRelativeTime(pm.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground">{pm.content || "Attachment"}</p>
                    <button onClick={() => { handlePin(pm); setShowAllPinned(false); }} className="mt-2 text-[11px] text-destructive font-medium hover:underline">Unpin</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar Item Component ─── */

function SidebarItem({
  isActive, unread, onClick, avatar, name, subtitle, time, isSubtitleItalic, presenceDot,
}: {
  isActive: boolean;
  unread: number;
  onClick: () => void;
  avatar: React.ReactNode;
  name: string;
  subtitle: string;
  time?: string;
  isSubtitleItalic?: boolean;
  presenceDot?: "online" | "offline";
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2 border-l-transparent hover:bg-muted/30 cursor-pointer",
        isActive && "chat-sidebar-active border-l-2",
      )}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
        {avatar}
        {presenceDot && (
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", presenceDot === "online" ? "bg-emerald-500" : "bg-gray-400")} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-semibold text-foreground truncate", unread > 0 && "font-bold")}>{name}</p>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            {time && <span suppressHydrationWarning className={cn("text-[10px]", unread > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>{time}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn("text-[11px] text-muted-foreground truncate", isSubtitleItalic && "italic opacity-50")}>{subtitle}</p>
          {unread > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 shrink-0">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
