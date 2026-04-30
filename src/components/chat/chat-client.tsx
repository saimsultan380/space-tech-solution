"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
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
  getChannelEvents,
  createChatEvent,
  getAllMyEvents,
  updateChatEvent,
  deleteChatEvent,
  getFullChannelData,
  type ChatChannel,
  type ChatMessage,
  type ChatEvent,
} from "@/lib/actions/chat";
import {
  getNotifications,
  markNotificationsAsRead,
} from "@/lib/actions/notifications";
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
  Eraser,
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
  Calendar,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  CalendarDays,
  AlertCircle,
  Edit3,
  LayoutDashboard,
  Clock,
  ExternalLink,
  Mic,
  Globe,
  MessageCircle,
  UserPlus,
  PanelRightOpen,
  PanelRightClose,
  CircleDot,
  EyeOff,
  MinusCircle,
  MoreVertical,
  Sun,
  Moon,
} from "lucide-react";
import type { UserRole, Notification } from "@/lib/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

/* ─── Types ─── */

type PresenceStatus = "online" | "away" | "dnd" | "invisible";
type ActiveTab = "chat" | "files" | "photos" | "links" | "calendar";
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── State ───
  const [channels, setChannels] = useState(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(urlChannelId ?? null);
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
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'channels' | 'direct'>('all');
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  // Calendar
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventTab, setEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventChannelId, setNewEventChannelId] = useState<string | null>(activeChannelId);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);

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
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Channel settings
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [editChName, setEditChName] = useState("");
  const [editChDesc, setEditChDesc] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [settingsMembers, setSettingsMembers] = useState<string[]>([]);
  const [channelActionError, setChannelActionError] = useState<string | null>(null);

  // Header options menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuBtnRef = useRef<HTMLButtonElement>(null);

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
  const fetchedUrlChannelRef = useRef<string | null>(null);
  const hasLoadedInitialMessagesRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // ─── Derived ───

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const regularChannels = channels.filter((c) => !c.is_direct);
  const dmChannels = channels.filter((c) => c.is_direct && (c.last_message || c.id === activeChannelId));

  const filteredRegularChannels = (sidebarFilter === 'all' || sidebarFilter === 'channels')
    ? (sidebarSearch
        ? regularChannels.filter((c) => c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
        : regularChannels)
    : [];

  const filteredDmChannels = (sidebarFilter === 'all' || sidebarFilter === 'direct')
    ? (sidebarSearch
        ? dmChannels.filter((c) => {
            const name = c.dm_partner?.full_name ?? c.name;
            return name.toLowerCase().includes(sidebarSearch.toLowerCase());
          })
        : dmChannels)
    : [];

  const filteredMessages = showSearch && searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Auto-expand accordion when a channel/DM is selected
  useEffect(() => {
    if (activeChannelId) {
      const isRegular = regularChannels.some((c) => c.id === activeChannelId);
      const isDM = dmChannels.some((c) => c.id === activeChannelId);
      if (isRegular) setChannelsOpen(true);
      if (isDM) setDmOpen(true);
    }
  }, [activeChannelId, regularChannels.length, dmChannels.length]);

  const fileMessages = messages.filter((m) => m.attachment_url && !m.is_deleted && !m.attachment_type?.startsWith("image/"));
  const photoMessages = messages.filter((m) => m.attachment_url && !m.is_deleted && m.attachment_type?.startsWith("image/"));
  const linkMessages = messages.filter((m) => !m.is_deleted && m.content && /https?:\/\/[^\s]+/.test(m.content));

  const channelTypingUsers = Object.entries(typingUsers)
    .filter(([uid]) => uid !== currentUserId)
    .map(([, name]) => name);

  // ─── Notification Handlers ───

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationsAsRead([id]);
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markNotificationsAsRead(unreadIds);
  };

  // ─── Effects ───

  // Fetch notifications
  useEffect(() => {
    if (!currentUserId) return;

    const fetchInitialNotifications = async () => {
      setLoadingNotifications(true);
      const data = await getNotifications("chat");
      setNotifications(data);
      setLoadingNotifications(false);
    };

    fetchInitialNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        () => {
          fetchInitialNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsPanelRef.current &&
        !notificationsPanelRef.current.contains(event.target as Node) &&
        notificationsButtonRef.current &&
        !notificationsButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!urlChannelId || urlChannelId === activeChannelId) return;
    setActiveChannelId(urlChannelId);
    setMobileShowChat(true);

    // Only fetch once per URL channel id if it's not already present.
    if (fetchedUrlChannelRef.current === urlChannelId) return;
    fetchedUrlChannelRef.current = urlChannelId;

    const fetchChannelFromUrl = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_channels")
        .select("*")
        .eq("id", urlChannelId)
        .single();
      if (!data) return;
      setChannels((prev) =>
        prev.some((c) => c.id === urlChannelId) ? prev : [{ ...(data as ChatChannel), last_message: null, dm_partner: null }, ...prev]
      );
    };

    void fetchChannelFromUrl();
  }, [urlChannelId, activeChannelId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttachMenu(false);

      setShowPresenceMenu(false);
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);

      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  // Load channel data when channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    let cancelled = false;
    async function load() {
      hasLoadedInitialMessagesRef.current = false;
      setLoadingMsgs(true);
      try {
        const data = await getFullChannelData(activeChannelId!);
        
        if (!cancelled) {
          setMessages(data.messages);
          setMembers(data.members as Member[]);
          setPinnedMessages(data.pinnedMessages);
          setEvents(data.events);
          setLoadingMsgs(false);
          requestAnimationFrame(() => {
            scrollToBottom("auto");
            hasLoadedInitialMessagesRef.current = true;
          });
        }
      } catch (err) {
        console.error("Failed to load channel data:", err);
        if (!cancelled) setLoadingMsgs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeChannelId, scrollToBottom]);

  // Load global events for calendar view
  useEffect(() => {
    if (!activeChannelId && activeTab === 'calendar') {
      getAllMyEvents().then(setEvents);
    }
  }, [activeChannelId, activeTab]);

  useEffect(() => {
    if (!hasLoadedInitialMessagesRef.current) return;
    scrollToBottom("smooth");
  }, [messages.length, scrollToBottom]);

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
    setMobileShowChat(true);
    setSearchQuery("");
    setShowSearch(false);
    setActiveTab("chat");
    setNewEventChannelId(channelId);
  };

  const handleCreateEvent = async () => {
    let targetChannelId = newEventChannelId || activeChannelId;
    
    // If no channel is selected (Global View), default to first available channel
    if (!targetChannelId && channels.length > 0) {
      const generalChannel = channels.find(c => c.name.toLowerCase() === 'general') || channels[0];
      targetChannelId = generalChannel.id;
    }

    if (!newEventTitle.trim() || !newEventDate || !targetChannelId) return;
    
    setCreatingEvent(true);
    try {
      if (editingEventId) {
        const { error } = await updateChatEvent(editingEventId, {
          title: newEventTitle,
          description: newEventDesc,
          event_date: new Date(newEventDate).toISOString()
        });
        if (error) throw error;
        setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, title: newEventTitle, description: newEventDesc, event_date: newEventDate } : e).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
      } else {
        const { data, error } = await createChatEvent({
          channel_id: targetChannelId,
          title: newEventTitle,
          description: newEventDesc,
          event_date: new Date(newEventDate).toISOString() // Convert to absolute UTC for server
        });

        if (error) throw error;

        if (data) {
          setEvents((prev) => [data as ChatEvent, ...prev].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
        }
      }
      
      setShowNewEvent(false);
      setEditingEventId(null);
      setNewEventTitle("");
      setNewEventDesc("");
      setNewEventDate("");
      setNewEventChannelId(activeChannelId);
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { error } = await deleteChatEvent(eventId);
      if (error) throw error;
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
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
        const supabase = createClient();
        const [{ data: ch }, { data: dmMembers }] = await Promise.all([
          supabase
            .from("chat_channels")
            .select("*")
            .eq("id", result.channelId)
            .single(),
          supabase
            .from("chat_channel_members")
            .select("user_id")
            .eq("channel_id", result.channelId)
            .neq("user_id", currentUserId),
        ]);

        let dmPartner: ChatChannel["dm_partner"] = null;
        const otherUserId = dmMembers?.[0]?.user_id;
        if (otherUserId) {
          const { data: otherUser } = await supabase
            .from("users")
            .select("id, full_name, avatar_url")
            .eq("id", otherUserId)
            .single();
          if (otherUser) dmPartner = otherUser;
        }

        if (ch) {
          const hydratedChannel: ChatChannel = {
            ...(ch as ChatChannel),
            last_message: null,
            dm_partner: dmPartner,
          };
          setChannels((prev) => [hydratedChannel, ...prev.filter((c) => c.id !== hydratedChannel.id)]);
        }
        handleSelectChannel(result.channelId);
      }
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
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
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true, content: "" } : m));
    await deleteMessage(msgId);
  };

  const handlePin = async (msg: ChatMessage) => {
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
    const result = await clearChannelMessages(activeChannelId);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setMessages([]);
    setPinnedMessages([]);
  };

  const handleDeleteChannel = async () => {
    if (!activeChannelId || !activeChannel) return;
    const label = activeChannel.is_direct ? "this conversation" : `channel "${activeChannel.name}"`;
    if (!confirm(`Delete ${label} and all its messages for everyone? This cannot be undone.`)) return;
    setSavingChannel(true); setChannelActionError(null);
    const result = await deleteChannel(activeChannelId);
    setSavingChannel(false);
    if (result.error) { setChannelActionError(result.error); alert(result.error); return; }
    setChannels((prev) => prev.filter((c) => c.id !== activeChannelId));
    setActiveChannelId(null); setMessages([]); setMembers([]); setShowChannelSettings(false);
  };

  const handleDeleteChannelFromSidebar = async (channelId: string, channelName: string) => {
    if (!confirm(`Delete channel "${channelName}" and all its messages for everyone? This cannot be undone.`)) return;
    const result = await deleteChannel(channelId);
    if (result.error) { alert(result.error); return; }
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (activeChannelId === channelId) {
      setActiveChannelId(null); setMessages([]); setMembers([]);
    }
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

  // Helper for local ISO string (used for datetime-local inputs)
  const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
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

  const getDmDisplayName = (ch: ChatChannel) => {
    if (ch.is_direct && ch.dm_partner?.id === currentUserId) return "You (Message Yourself)";
    return ch.dm_partner?.full_name ?? ch.name;
  };
  const getDmAvatar = (ch: ChatChannel) => ch.dm_partner?.avatar_url ?? null;
  const isDmOnline = (ch: ChatChannel) => ch.dm_partner ? onlineUsers.has(ch.dm_partner.id) : false;

  // ─── Render ───

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center font-[family-name:var(--font-dm-sans)] bg-background text-foreground">
      <div className="flex h-full w-full overflow-hidden bg-background shadow-none">
      {/* ═══════════════════════════════ LEFT SIDEBAR ═══════════════════════════════ */}
      <div className={cn("flex w-full flex-col border-r border-border bg-card md:w-[280px] md:shrink-0", mobileShowChat && "hidden md:flex")}>

        {/* User header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold overflow-hidden transition-all">
                {currentUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
                ) : getInitials(currentUserName)}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowPresenceMenu((p) => !p); }}
                className="text-left"
              >
                <h2 className="text-sm font-bold text-foreground leading-tight">{currentUserName}</h2>
              </button>
              {showPresenceMenu && (
                <div className="absolute top-full left-0 mt-2 z-50 w-48 rounded-[5px] bg-card border border-border shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                  {(Object.entries(PRESENCE_META) as [PresenceStatus, typeof PRESENCE_META["online"]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => { setMyPresence(key); setShowPresenceMenu(false); }}
                      className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors font-bold text-foreground", myPresence === key && "bg-muted text-primary")}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", meta.color)} />
                      {meta.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 relative">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-[5px] p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-all"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
            </button>
            <Link
              href="/dashboard"
              className="rounded-[5px] p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-all"
              title="Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>
            <button
              ref={notificationsButtonRef}
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative rounded-[5px] p-2 transition-all",
                showNotifications ? "bg-primary text-white" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
              )}
            </button>
            {/* Notification Panel */}
            {showNotifications && (
              <div
                ref={notificationsPanelRef}
                className="fixed sm:absolute top-[72px] sm:top-[calc(100%+8px)] left-4 right-4 sm:left-[-140px] sm:w-[320px] rounded-[5px] bg-card border border-border shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top"
              >
                <div className="flex items-center justify-between border-b border-foreground/5 px-3 py-2 bg-muted/5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Activity
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-muted-foreground hover:bg-muted"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] sm:max-h-[380px] overflow-y-auto no-scrollbar">
                  {loadingNotifications && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">All caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-foreground/5">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={cn(
                            "w-full flex items-start gap-3 border-b border-foreground/5 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/30",
                            !n.is_read && "bg-primary/[0.03]"
                          )}
                        >
                          <div className="relative shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {getInitials(n.title.replace("New message from ", "").replace("New message in #", ""))}
                            </div>
                            {!n.is_read && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("truncate text-[13px] text-foreground", !n.is_read ? "font-bold" : "font-medium")}>
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatRelativeTime(n.created_at)}
                              </span>
                            </div>
                            <p className={cn(
                              "mt-0.5 line-clamp-2 text-[11px] leading-relaxed",
                              !n.is_read ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {n.body}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  className="w-full py-3 bg-muted/5 text-center text-[11px] font-bold text-primary hover:bg-muted/10 transition-colors uppercase tracking-widest border-t border-foreground/5"
                >
                  Full History
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-[5px] bg-muted/20 px-4 py-2.5 transition-all border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search chats & people..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-medium text-foreground"
            />
          </div>
        </div>

        {/* Filter Types */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-[5px] overflow-x-auto no-scrollbar">
            {(['all', 'channels', 'direct'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setSidebarFilter(filter);
                  if (activeTab === 'calendar') {
                    setActiveTab('chat');
                  }
                }}
                className={cn(
                  "flex-1 px-4 py-2 rounded-[4px] text-[11px] font-bold transition-all shrink-0 capitalize",
                  sidebarFilter === filter
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={sidebarFilter === filter ? {
                  backgroundColor: 'var(--theme-active-tab-color, hsl(var(--primary)))',
                  color: 'var(--theme-active-tab-text-color, white)'
                } : {}}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Channel & DM list */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {/* Channels section */}
          {(sidebarFilter === 'all' || sidebarFilter === 'channels') && (
            <>
              <div className="px-4 pt-2 pb-1 flex items-center justify-between group/section">
                <button 
                  onClick={() => setChannelsOpen(!channelsOpen)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", !channelsOpen && "-rotate-90")} />
                  Channels
                </button>
                {currentUserRole === "super_admin" && (
                  <button onClick={() => { setShowNewChannel(true); setCreateError(null); }} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-all" title="New channel">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {channelsOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
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
                      showDelete={currentUserRole === "super_admin" || ch.created_by === currentUserId}
                      onDelete={() => handleDeleteChannelFromSidebar(ch.id, ch.name)}
                    />
                  ))}

                  {filteredRegularChannels.length === 0 && !sidebarSearch && (
                    <p className="px-4 py-3 text-xs text-muted-foreground italic font-medium">No channels</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Direct Messages section */}
          {(sidebarFilter === 'all' || sidebarFilter === 'direct') && (
            <>
              <div className={cn("px-4 pb-1 flex items-center justify-between group/section", sidebarFilter === 'all' ? "pt-6" : "pt-2")}>
                <button 
                  onClick={() => setDmOpen(!dmOpen)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", !dmOpen && "-rotate-90")} />
                  Individual Chats
                </button>
                <button onClick={() => { setShowNewDM(true); setDmSearchQuery(""); }} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-all" title="New message">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {dmOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
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
                        showDelete={currentUserRole === "super_admin" || ch.created_by === currentUserId}
                        onDelete={() => handleDeleteChannelFromSidebar(ch.id, dmName)}
                      />
                    );
                  })}

                  {filteredDmChannels.length === 0 && !sidebarSearch && (
                    <p className="px-4 py-3 text-xs text-muted-foreground italic font-medium">No conversations yet</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Bottom Bar */}
        <div className="p-4 border-t border-border mt-auto shrink-0">
          <button
            onClick={() => { 
              setActiveChannelId(null); 
              setActiveTab('calendar'); 
              setSidebarFilter('all'); // Reset filter to show it clearly
              setMobileShowChat(true); // Ensure it shows on mobile
            }}
            className="flex w-full items-center justify-between rounded-[5px] px-4 py-3 text-sm font-bold transition-all border border-border shadow-sm hover:opacity-90 active:scale-95"
            style={{ 
              backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))',
              color: 'var(--theme-button-text-color, white)'
            }}
          >
            Calendar
            <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white/20">
              <CalendarDays className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════ CENTER — CHAT AREA ═══════════════════════════════ */}
      <div className={cn("flex flex-1 min-w-0 flex-col bg-background", !mobileShowChat && "hidden md:flex")}>
        {activeTab === "calendar" ? (
          <div className="flex-1 overflow-y-auto bg-background p-8 sm:p-16 pt-12 sm:pt-24 no-scrollbar tab-content-animate">
            <div className="mx-auto max-w-5xl space-y-8">
              {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4">
                  {!activeChannelId && (
                    <button onClick={handleMobileBack} className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted md:hidden transition-colors"><ChevronLeft className="h-6 w-6" /></button>
                  )}
                  <div>
                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3 tracking-tight">
                      <div className="h-10 w-10 rounded-[5px] bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      {activeChannelId ? `${activeChannel?.name} Schedule` : "Overall Schedule"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1.5 font-medium opacity-80">
                      {activeChannelId ? "Events and reminders for this channel" : "Global overview of all your team events"}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setNewEventChannelId(activeChannelId);
                    setShowNewEvent(true);
                  }}
                  className="inline-flex items-center justify-center gap-2.5 rounded-[5px] px-6 py-3 text-sm font-black transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))', color: 'var(--theme-button-text-color, white)' }}
                >
                  <Plus className="h-5 w-5" />
                  Create Event
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Calendar & Stats */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="rounded-[5px] border border-border bg-card p-6 ring-1 ring-border/5">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-base font-black capitalize tracking-tight text-foreground">
                        {calendarMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1)))}
                          className="p-2 rounded-[5px] hover:bg-muted transition-all active:scale-90"
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1)))}
                          className="p-2 rounded-[5px] hover:bg-muted transition-all active:scale-90"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-4">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <span key={`${d}-${i}`} className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">{d}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ))}
                      {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const day = i + 1;
                        const dateObj = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                        const isToday = new Date().toDateString() === dateObj.toDateString();
                        const isSelected = selectedDate?.toDateString() === dateObj.toDateString();
                        const hasEvent = events.some(e => new Date(e.event_date).toDateString() === dateObj.toDateString());
                        
                        return (
                          <button 
                            key={day} 
                            onClick={() => setSelectedDate(dateObj)}
                            className={cn(
                              "aspect-square flex items-center justify-center text-xs rounded-[5px] transition-all relative font-bold",
                              isSelected 
                                ? "bg-primary text-white scale-105 z-10" 
                                : isToday 
                                  ? "bg-primary/10 text-primary border border-primary/20" 
                                  : "hover:bg-muted text-foreground/70 hover:text-foreground"
                            )}
                          >
                            {day}
                            {hasEvent && !isSelected && (
                              <span className={cn(
                                "absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                                isToday ? "bg-primary" : "bg-primary/60"
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[5px] border border-border bg-card p-6 ring-1 ring-border/5 flex items-center gap-5 transition-all">
                    <div className="h-14 w-14 rounded-[5px] bg-primary/10 flex items-center justify-center text-primary ring-4 ring-primary/5">
                      <Clock className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mb-1">Upcoming Focus</p>
                      <p className="text-2xl font-black text-foreground">
                        {events.filter(e => new Date(e.event_date) > new Date()).length} <span className="text-sm font-bold text-muted-foreground ml-1">Events</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Events List */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setEventTab('upcoming')} 
                        className={cn("text-sm font-black uppercase tracking-widest pb-1 border-b-2 transition-all", eventTab === 'upcoming' ? "text-primary border-primary" : "text-muted-foreground border-transparent opacity-60 hover:opacity-100")}
                      >
                        Upcoming
                      </button>
                      <button 
                        onClick={() => setEventTab('past')} 
                        className={cn("text-sm font-black uppercase tracking-widest pb-1 border-b-2 transition-all", eventTab === 'past' ? "text-primary border-primary" : "text-muted-foreground border-transparent opacity-60 hover:opacity-100")}
                      >
                        Past
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 sm:max-w-xs">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input 
                          value={eventSearch}
                          onChange={(e) => setEventSearch(e.target.value)}
                          placeholder="Search events..."
                          className="w-full rounded-[5px] border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                      </div>
                      {selectedDate && (
                        <button onClick={() => setSelectedDate(null)} className="text-[11px] font-bold text-primary hover:underline shrink-0">View All</button>
                      )}
                    </div>
                  </div>

                  <div className="px-2">
                    <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                      {selectedDate ? `Schedule for ${selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}` : `${eventTab} Overview`}
                    </h3>
                  </div>

                  {(() => {
                    let filteredEvents = selectedDate 
                      ? events.filter(e => new Date(e.event_date).toDateString() === selectedDate.toDateString())
                      : events;

                    // Filter by Tab (Upcoming vs Past)
                    const now = new Date();
                    if (eventTab === 'upcoming') {
                      filteredEvents = filteredEvents.filter(e => new Date(e.event_date) >= now);
                    } else {
                      filteredEvents = filteredEvents.filter(e => new Date(e.event_date) < now);
                      // Sort past events by newest first
                      filteredEvents.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
                    }

                    // Filter by Search
                    if (eventSearch.trim()) {
                      const q = eventSearch.toLowerCase();
                      filteredEvents = filteredEvents.filter(e => 
                        e.title.toLowerCase().includes(q) || 
                        (e.description && e.description.toLowerCase().includes(q))
                      );
                    }

                    return filteredEvents.length === 0 ? (
                      <div className="rounded-[5px] border-2 border-dashed border-border/50 p-16 text-center flex flex-col items-center gap-4 bg-muted/5">
                        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                          <CalendarIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-black text-foreground">No events scheduled</p>
                          <p className="text-sm text-muted-foreground font-medium">Nothing on the agenda for this period.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setNewEventDate(selectedDate ? new Date(selectedDate.setHours(9, 0)).toISOString().slice(0, 16) : "");
                            setShowNewEvent(true);
                          }}
                          className="text-sm text-primary font-black hover:underline mt-4 uppercase tracking-wider"
                        >
                          Schedule Something Now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {filteredEvents.map((evt) => {
                          const date = new Date(evt.event_date);
                          const isPast = date < new Date();
                          return (
                            <div key={evt.id} className={cn(
                              "group rounded-[5px] border border-border bg-card p-5 transition-all hover:-translate-y-0.5 flex items-start gap-6 relative overflow-hidden",
                              isPast && "opacity-60 grayscale-[0.3]"
                            )}>
                              <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-[5px] bg-muted/30 border border-border group-hover:border-primary/20 transition-colors shadow-inner">
                                <span className="text-[11px] font-black uppercase text-primary leading-none tracking-tighter">{date.toLocaleDateString('default', { month: 'short' })}</span>
                                <span className="text-2xl font-black leading-none mt-1 text-foreground">{date.getDate()}</span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <h4 className="text-lg font-black text-foreground truncate group-hover:text-primary transition-colors tracking-tight">{evt.title}</h4>
                                    {!activeChannelId && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-primary font-black uppercase tracking-widest">
                                        <Hash className="h-3.5 w-3.5" />
                                        {channels.find(c => c.id === evt.channel_id)?.name || "Direct Chat"}
                                      </div>
                                    )}
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1">
                                      {evt.creator_id === currentUserId && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                          <button 
                                            onClick={() => {
                                              setEditingEventId(evt.id);
                                              setNewEventTitle(evt.title);
                                              setNewEventDesc(evt.description || "");
                                              setNewEventDate(toLocalISOString(new Date(evt.event_date)));
                                              setShowNewEvent(true);
                                            }}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteEvent(evt.id)}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      )}
                                      <span className="text-[11px] font-black text-foreground bg-muted px-2.5 py-1 rounded-[5px] uppercase tracking-tight">
                                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    {isPast && <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Completed</span>}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium line-clamp-2 mt-2 leading-relaxed opacity-90">{evt.description || "No description provided."}</p>
                                <div className="flex items-center gap-3 mt-5">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-primary/10 overflow-hidden ring-2 ring-background">
                                    {evt.creator?.avatar_url ? (
                                      <img src={evt.creator.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-[9px] font-black text-primary">{getInitials(evt.creator?.full_name || "")}</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground font-medium">Organized by <span className="font-black text-foreground">{evt.creator?.full_name}</span></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : activeChannel ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 bg-card border-b border-border px-4 py-3.5 sm:px-6 sticky top-0 z-30">
              <button onClick={handleMobileBack} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"><ChevronLeft className="h-5 w-5" /></button>
              <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
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
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 border-2 border-background presence-online" />
                )}
              </div>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { setShowHeaderMenu(true); }}>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight">
                  {activeChannel.is_direct ? getDmDisplayName(activeChannel) : activeChannel.name}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1 leading-none mt-0.5">
                  {activeChannel.is_direct ? (
                    <>
                      <span className={cn("h-1.5 w-1.5 rounded-full", isDmOnline(activeChannel) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                      {isDmOnline(activeChannel) ? "Online" : "Offline"}
                    </>
                  ) : (
                    <>
                      <Users className="h-2.5 w-2.5" />
                      {members.length} members
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 overflow-visible">
                <button onClick={() => setShowSearch(!showSearch)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-all">
                  <Search className="h-4 w-4" />
                </button>
                <div ref={headerMenuRef} className="relative">
                  <button
                    ref={headerMenuBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeaderMenu(!showHeaderMenu);
                    }}
                    className={cn("shrink-0 rounded-lg p-2 transition-all", showHeaderMenu ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary")}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showHeaderMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                      <div className="p-1.5">
                        {!activeChannel?.is_direct && (
                          <button
                            onClick={() => {
                              setShowChannelSettings(true);
                              setShowHeaderMenu(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                          >
                            <Users className="h-4 w-4 text-primary" />
                            Channel Settings
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleClearChat();
                            setShowHeaderMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                        >
                          <Eraser className="h-4 w-4 text-amber-500" />
                          Clear Messages
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => {
                            handleDeleteChannel();
                            setShowHeaderMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          {activeChannel?.is_direct ? "Delete Chat" : "Delete Channel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2 animate-slide-down sticky top-[53px] sm:top-[57px] z-20 shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="flex-1 bg-transparent text-sm outline-none" autoFocus />
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-background px-4 py-2.5 shrink-0 sticky top-[53px] sm:top-[57px] z-20">
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-[5px] no-scrollbar overflow-x-auto">
                {(["chat", "files", "photos", "links", "calendar"] as ActiveTab[]).map((tab) => {
                  const icons: Record<ActiveTab, React.ElementType> = { 
                    chat: MessageSquare, 
                    files: FileText, 
                    photos: ImageIcon, 
                    links: Link2,
                    calendar: CalendarIcon 
                  };
                  const Icon = icons[tab];
                  const count = tab === "files" ? fileMessages.length : tab === "photos" ? photoMessages.length : tab === "links" ? linkMessages.length : tab === "calendar" ? events.length : 0;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold capitalize transition-all rounded-[5px] shrink-0",
                        activeTab === tab 
                          ? "shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                      )}
                      style={activeTab === tab ? {
                        backgroundColor: 'var(--theme-active-tab-color, hsl(var(--primary)))',
                        color: 'var(--theme-active-tab-text-color, white)'
                      } : {}}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab}
                      {count > 0 && tab !== "chat" && (
                        <span className={cn("ml-1.5 text-[10px] rounded-[4px] px-1.5 py-0.5", activeTab === tab ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
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
                    <div className="flex items-center gap-2 border-b border-border bg-amber-500/10 px-4 py-3 cursor-pointer hover:bg-amber-500/20 transition-colors" onClick={() => setShowAllPinned(true)}>
                      <Pin className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-sm text-foreground truncate flex-1 font-bold">
                        {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
                        <span className="text-muted-foreground ml-3 font-medium">{pinnedMessages[0]?.content?.slice(0, 50)}</span>
                      </p>
                      <span className="text-[11px] text-primary font-black uppercase tracking-wider shrink-0">See all</span>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 sm:py-4 no-scrollbar bg-background">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="rounded-[5px] border border-border bg-card px-10 py-8 text-center shadow-sm">
                          <MessageSquare className="mx-auto h-16 w-16 mb-4 text-primary/20" />
                          <p className="text-base font-bold text-foreground">{showSearch ? "No matches found" : "No messages yet"}</p>
                          <p className="text-sm mt-2 font-medium opacity-60">{showSearch ? "Try a different search term" : `Send the first message in ${activeChannel.is_direct ? "this conversation" : "#" + activeChannel.name}`}</p>
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
                                <div className="flex justify-center relative my-6">
                                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                  <span className="relative rounded-full bg-background px-4 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{formatDateSeparator(msg.created_at)}</span>
                                </div>
                              )}
                              <div className={cn("flex flex-col mb-1", isOwn ? "items-end" : "items-start")}>
                                {/* Sender name above bubble (Strictly for others) */}
                                {!isOwn && !sameAsPrev && !msg.is_deleted && (
                                  <span className="text-[11px] font-bold text-muted-foreground mb-1 ml-1">{msg.sender?.full_name ?? "Unknown"}</span>
                                )}
                                
                                <div className={cn(
                                  "flex items-end",
                                  isOwn ? "flex-row-reverse" : "flex-row"
                                )}>
                                  {/* Avatar for others */}
                                  {!isOwn && !sameAsPrev && (
                                    <div className="relative mr-2 mb-0.5 shrink-0">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary overflow-hidden">
                                        {msg.sender?.avatar_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={msg.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : getInitials(msg.sender?.full_name ?? "?")}
                                      </div>
                                      {onlineUsers.has(msg.sender_id) && (
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background shadow-none" />
                                      )}
                                    </div>
                                  )}
                                  {!isOwn && sameAsPrev && <div className="w-10 shrink-0" />}

                                  <div className={cn(
                                    "group relative transition-all shadow-none min-w-[120px] max-w-[85%] sm:max-w-[70%]",
                                    hasAttachment && !msg.content ? "p-1.5" : "px-3.5 py-2",
                                    msg.is_deleted && "opacity-50 grayscale",
                                    isOwn ? "rounded-[5px] rounded-br-[4px]" : "border border-border rounded-[5px] rounded-bl-[4px]",
                                  )}
                                  style={{
                                    backgroundColor: isOwn ? 'var(--theme-chat-user-bg, hsl(var(--primary)))' : 'var(--theme-chat-bot-bg, hsl(var(--card)))',
                                    color: isOwn ? 'var(--theme-chat-user-text, white)' : 'var(--theme-chat-bot-text, hsl(var(--foreground)))'
                                  }}>
                                    {/* Reply preview */}
                                    {msg.reply_to && !msg.is_deleted && (
                                      <div className={cn("mb-1.5 rounded-[5px] px-2.5 py-1.5 border-l-2", isOwn ? "bg-white/10 border-white/40" : "bg-primary/5 border-primary")}>
                                        <p className={cn("text-[10px] font-bold uppercase tracking-tight", isOwn ? "text-white/80" : "text-primary")}>{msg.reply_to.sender?.full_name ?? "Unknown"}</p>
                                        <p className={cn("text-xs truncate font-medium opacity-80", isOwn ? "text-white" : "text-muted-foreground")}>{msg.reply_to.content}</p>
                                      </div>
                                    )}

                                    {/* Pinned indicator */}
                                    {msg.is_pinned && !msg.is_deleted && (
                                      <div className={cn("flex items-center gap-1.5 mb-1", isOwn ? "text-white/70" : "text-amber-600")}>
                                        <Pin className="h-3 w-3" />
                                        <span className="text-[9px] font-bold uppercase tracking-tight">Pinned</span>
                                      </div>
                                    )}

                                    {/* Attachment */}
                                    {hasAttachment && !msg.is_deleted && (
                                      <div className={cn(hasAttachment && msg.content && "mb-1.5")}>
                                        {isImg ? (
                                          <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[5px]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={msg.attachment_url!} alt={msg.attachment_name ?? "image"} className="max-w-full max-h-80 object-cover hover:scale-105 transition-transform duration-300" />
                                          </a>
                                        ) : msg.attachment_type?.startsWith("audio/") ? (
                                          <div className={cn("rounded-[5px] px-2 py-1.5", isOwn ? "bg-white/10" : "bg-primary/5 border border-primary/10")}>
                                            <audio controls src={msg.attachment_url!} className="h-7 w-full max-w-[200px]" />
                                          </div>
                                        ) : (
                                          <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all", isOwn ? "bg-white/10 hover:bg-white/20" : "bg-muted/50 border border-border hover:bg-muted")}>
                                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isOwn ? "bg-white/20" : "bg-primary/10")}>
                                              <FileText className={cn("h-5 w-5", isOwn ? "text-white" : "text-primary")} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11px] font-bold truncate">{msg.attachment_name}</p>
                                              <p className={cn("text-[9px] font-bold opacity-60", isOwn ? "text-white" : "text-muted-foreground")}>{msg.attachment_size ? formatFileSize(msg.attachment_size) : "File"}</p>
                                            </div>
                                            <Download className={cn("h-3.5 w-3.5 shrink-0 opacity-60", isOwn ? "text-white" : "text-muted-foreground")} />
                                          </a>
                                        )}
                                      </div>
                                    )}

                                    {/* Message body */}
                                    {editingMsgId === msg.id ? (
                                      <div className="flex items-center gap-2 my-1">
                                        <input ref={editInputRef} value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") { setEditingMsgId(null); setEditContent(""); } }}
                                          className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm outline-none text-white font-medium" />
                                        <button onClick={handleSaveEdit} className="shrink-0 rounded-lg p-1.5 bg-white text-primary hover:bg-gray-100"><Check className="h-4 w-4" /></button>
                                        <button onClick={() => { setEditingMsgId(null); setEditContent(""); }} className="shrink-0 rounded-lg p-1.5 bg-white/10 hover:bg-white/20"><X className="h-4 w-4" /></button>
                                      </div>
                                    ) : msg.is_deleted ? (
                                      <div className="flex items-center gap-2 px-1"><Ban className="h-3.5 w-3.5 opacity-50" /><p className="text-xs italic font-medium opacity-70 select-none">Message deleted</p></div>
                                    ) : msg.content ? (
                                      <p className={cn(
                                        "text-sm sm:text-[15px] leading-relaxed font-medium break-words whitespace-pre-wrap",
                                        isOwn ? "text-white" : "text-foreground"
                                      )}>{msg.content}</p>
                                    ) : null}

                                    {/* Time + receipts */}
                                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
                                      {msg.is_edited && !msg.is_deleted && (
                                        <span className="text-[8px] font-bold uppercase tracking-tight">edited</span>
                                      )}
                                      <span suppressHydrationWarning className="text-[9px] font-bold">{formatTime(msg.created_at)}</span>
                                      {isOwn && !msg.is_deleted && (
                                        <CheckCheck className="h-3 w-3" />
                                      )}
                                    </div>

                                    {/* Hover action toolbar */}
                                    {!msg.is_deleted && editingMsgId !== msg.id && (
                                      <div className={cn(
                                        "absolute -top-5 flex items-center gap-1 rounded-[5px] bg-card border border-border p-0.5 opacity-0 group-hover:opacity-100 transition-all z-10",
                                        isOwn ? "right-0" : "left-0",
                                      )}>
                                        <div className="flex items-center gap-1 px-1 border-r border-border">
                                          <button className="hover:scale-110 transition-transform text-sm" title="Thumbs up">👍</button>
                                          <button className="hover:scale-110 transition-transform text-sm" title="Heart">❤️</button>
                                          <button className="hover:scale-110 transition-transform text-sm" title="Laugh">😂</button>
                                        </div>
                                        <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Reply"><Reply className="h-3 w-3" /></button>
                                        <button onClick={() => handlePin(msg)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-amber-500 transition-colors" title={msg.is_pinned ? "Unpin" : "Pin"}>
                                          {msg.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                        </button>
                                        {isOwn && (
                                          <>
                                              <button onClick={() => handleStartEdit(msg)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Edit"><Pencil className="h-3 w-3" /></button>
                                              <button onClick={() => handleDelete(msg.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3 w-3" /></button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
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
                    <div className="flex items-center gap-2 px-4 py-3 bg-background">
                      <div className="flex items-center gap-1.5 bg-card border border-border px-4 py-3 rounded-[5px] rounded-bl-[4px] shadow-none w-fit">
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{channelTypingUsers.join(", ")}</span> {channelTypingUsers.length === 1 ? "is" : "are"} typing...
                      </p>
                    </div>
                  )}

                  {/* Reply banner */}
                  {replyTo && (
                    <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/95 px-4 py-2 sticky bottom-0 z-30 animate-in slide-in-from-bottom-2 duration-200">
                      <Reply className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-primary leading-none uppercase tracking-wider">{replyTo.sender?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{replyTo.content || "Attachment"}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  {/* Input bar */}
                  <div className="bg-card border-t border-border px-4 py-3 sm:px-8 sm:py-4 sticky bottom-0 z-20 transition-all">
                    <div className="w-full rounded-[5px] bg-muted/50 border border-border p-1.5">
                      <div className="flex items-center gap-2">
                        {/* Emoji & Attachment */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <div className="relative" ref={emojiRef}>
                            <button 
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                              className={cn(
                                "p-2 rounded-[5px] transition-all", 
                                showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                              )}
                              title="Add Emoji"
                            >
                              <Smile className="h-5 w-5" />
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-12 left-0 z-50 shadow-none rounded-[5px] overflow-hidden animate-in fade-in duration-200 border border-border">
                                <EmojiPicker onEmojiClick={handleEmojiSelect} width={320} height={400} searchPlaceHolder="Search emoji..." previewConfig={{ showPreview: false }} theme={theme as any} />
                              </div>
                            )}
                          </div>

                          <div className="relative" ref={attachRef}>
                            <button 
                              onClick={() => setShowAttachMenu(!showAttachMenu)} 
                              className={cn(
                                "p-2 rounded-[5px] transition-all", 
                                showAttachMenu ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                              )}
                              title="Attach File"
                            >
                              <Paperclip className="h-5 w-5" />
                            </button>
                            {showAttachMenu && (
                              <div className="absolute bottom-12 left-0 z-50 w-56 rounded-[5px] bg-card border border-border shadow-none py-2.5 animate-in fade-in duration-200">
                                <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-4 px-5 py-3.5 text-sm hover:bg-muted transition-colors text-foreground font-bold">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-primary/10"><ImageIcon className="h-5 w-5 text-primary" /></div>
                                  Photos & Videos
                                </button>
                                <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-4 px-5 py-3.5 text-sm hover:bg-muted transition-colors text-foreground font-bold">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-emerald-500/10"><FileText className="h-5 w-5 text-emerald-500" /></div>
                                  Documents
                                </button>
                              </div>
                            )}
                            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" className="hidden" onChange={handleFileInputChange} />
                          </div>
                        </div>

                        {/* Text input area */}
                        <div className="flex-1 overflow-hidden">
                          <textarea
                            ref={inputRef}
                            value={newMsg}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            maxLength={500}
                            placeholder="Type a message..."
                            className="w-full bg-transparent px-2 py-2 text-[15px] outline-none resize-none max-h-[100px] leading-relaxed placeholder:text-muted-foreground font-medium text-foreground no-scrollbar"
                            rows={1}
                            disabled={sending || uploading}
                          />
                        </div>

                        {/* Voice / Send button */}
                        <div className="shrink-0">
                          {newMsg.trim() ? (
                            <button 
                              onClick={handleSend} 
                              disabled={sending || uploading} 
                              className="flex h-10 w-10 items-center justify-center rounded-[5px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-md"
                              style={{
                                backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))',
                                color: 'var(--theme-button-text-color, white)'
                              }}
                            >
                              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </button>
                          ) : (
                            <button
                              onMouseDown={handleStartRecording}
                              onMouseUp={handleStopRecording}
                              onMouseLeave={handleStopRecording}
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-[5px] bg-card border border-border transition-all active:scale-95", 
                                isRecording ? "bg-red-500 text-white border-red-500 scale-110" : "text-muted-foreground hover:text-primary"
                              )}
                              title="Hold to record"
                            >
                              <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
                            </button>
                          )}
                        </div>
                      </div>
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
                  <div className="absolute right-0 top-0 bottom-0 z-20 w-80 border-l border-border overflow-y-auto bg-card shadow-none md:static md:z-auto md:w-72 md:shrink-0 panel-slide-in">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h4 className="text-sm font-bold text-foreground">
                        {activeChannel.is_direct ? "Conversation Info" : "Channel Info"}
                      </h4>
                      <button onClick={() => setShowMemberPanel(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
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
          <div className="flex flex-1 items-center justify-center bg-background p-6">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-12 w-12 text-primary/30" />
              </div>
              <p className="text-xl font-bold text-foreground">Team Chat</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">Select a channel or start a direct message to begin chatting with your team.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-[5px] px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))', color: 'var(--theme-button-text-color, white)' }}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-card border border-border p-5 sm:p-6 shadow-none">
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
              <button onClick={() => { setShowNewChannel(false); setCreateError(null); }} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button 
                onClick={handleCreateChannel} 
                disabled={creatingChannel || !newChannelName.trim()} 
                className="rounded-[5px] px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                style={{ backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))', color: 'var(--theme-button-text-color, white)' }}
              >
                {creatingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{creatingChannel ? "Creating..." : "Create Channel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New DM modal */}
      {showNewDM && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-card border border-border p-5 sm:p-6 shadow-none">
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
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", onlineUsers.has(u.id) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-card border border-border p-5 sm:p-6 shadow-none">
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
              <button 
                onClick={handleSaveChannelSettings} 
                disabled={savingChannel || !editChName.trim()} 
                className="w-full rounded-[5px] px-4 py-2.5 text-sm font-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                style={{ backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))', color: 'var(--theme-button-text-color, white)' }}
              >
                {savingChannel && <Loader2 className="h-4 w-4 animate-spin" />}{savingChannel ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleClearChat} className="w-full rounded-lg border border-red-100 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 transition-all">
                <Trash2 className="h-4 w-4" /> Clear All Messages
              </button>
              <button onClick={handleDeleteChannel} className="w-full rounded-lg border border-red-600 px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-all">
                <Trash2 className="h-4 w-4" /> Delete Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned messages panel */}
      {showAllPinned && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-card border border-border p-5 sm:p-6 shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2"><Pin className="h-5 w-5 text-amber-500" /> Pinned Messages</h3>
              <button onClick={() => setShowAllPinned(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {pinnedMessages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 font-medium">No pinned messages</p>
            ) : (
              <div className="space-y-3">
                {pinnedMessages.map((pm) => (
                  <div key={pm.id} className="rounded-2xl bg-muted/50 border border-border p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-black text-primary overflow-hidden">
                        {pm.sender?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pm.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : getInitials(pm.sender?.full_name ?? "?")}
                      </div>
                      <span className="text-xs font-black text-foreground">{pm.sender?.full_name}</span>
                      <span suppressHydrationWarning className="text-[10px] text-muted-foreground font-bold ml-auto">{formatRelativeTime(pm.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground font-medium leading-relaxed">{pm.content || "Attachment"}</p>
                    <button onClick={() => { handlePin(pm); setShowAllPinned(false); }} className="mt-3 text-[11px] text-red-500 font-black uppercase tracking-wider hover:underline">Unpin Message</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        {/* Global Modal - Outside all conditionals */}
        {showNewEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-[5px] bg-card border border-border overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-primary/10 text-primary">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">{editingEventId ? "Edit Event" : "Schedule New Event"}</h3>
                </div>
                <button onClick={() => setShowNewEvent(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Event Title</label>
                  <input 
                    value={newEventTitle} 
                    onChange={(e) => setNewEventTitle(e.target.value)} 
                    placeholder="What's happening?" 
                    className="w-full rounded-[5px] border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={newEventDate} 
                    onChange={(e) => setNewEventDate(e.target.value)} 
                    className="w-full rounded-[5px] border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Description (Optional)</label>
                  <textarea 
                    value={newEventDesc} 
                    onChange={(e) => setNewEventDesc(e.target.value)} 
                    placeholder="Add more details about this event..." 
                    className="w-full min-h-[100px] rounded-[5px] border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/50" 
                  />
                </div>

                {newEventDate && new Date(newEventDate) < new Date() && (
                  <div className="flex items-center gap-2.5 rounded-[5px] bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This event is scheduled in the past.
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border bg-muted/20 px-6 py-5">
                <button onClick={() => { setShowNewEvent(false); setEditingEventId(null); }} className="rounded-[5px] px-5 py-2.5 text-sm font-black text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                <button 
                  onClick={handleCreateEvent} 
                  disabled={creatingEvent || !newEventTitle.trim() || !newEventDate} 
                  className="flex items-center justify-center gap-2 rounded-[5px] px-6 py-2.5 text-sm font-black transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--theme-button-color, hsl(var(--primary)))', color: 'var(--theme-button-text-color, white)' }}
                >
                  {creatingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEventId ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {creatingEvent ? "Saving..." : editingEventId ? "Save Changes" : "Schedule Event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ─── Sidebar Item Component ─── */

function SidebarItem({
  isActive,
  unread,
  onClick,
  avatar,
  name,
  subtitle,
  time,
  isSubtitleItalic,
  presenceDot,
  showDelete,
  onDelete,
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
  showDelete?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group relative mx-2 mb-1 flex items-center gap-3 rounded-[5px] px-3 py-2 text-left transition-all cursor-pointer",
        isActive ? "shadow-md" : "hover:bg-muted/50",
      )}
      style={isActive ? {
        backgroundColor: 'var(--theme-active-tab-color, hsl(var(--primary)))',
        color: 'var(--theme-active-tab-text-color, white)'
      } : {}}
    >
      <div onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden transition-transform group-hover:scale-105",
          isActive ? "bg-white/20" : "bg-primary/10 text-primary"
        )}>
          {avatar}
          {presenceDot && (
            <span className={cn(
              "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2",
              isActive ? "border-primary" : "border-card",
              presenceDot === "online" ? "bg-emerald-500 shadow-none" : "bg-muted-foreground/30"
            )} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-[13px] font-bold truncate transition-colors flex-1 min-w-0",
              isActive ? "text-white" : "text-foreground",
              unread > 0 && !isActive && "text-primary"
            )}>{name}</p>
            {time && (
              <span suppressHydrationWarning className={cn(
                "text-[9px] font-bold uppercase tracking-tight whitespace-nowrap shrink-0",
                isActive ? "text-white/60" : unread > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {time}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={cn(
              "text-[11px] truncate leading-tight font-medium",
              isActive ? "text-white/70" : "text-muted-foreground",
              isSubtitleItalic && "italic opacity-60",
              unread > 0 && !isActive && "text-foreground font-bold"
            )}>{subtitle}</p>
            {unread > 0 && (
              <span className={cn(
                "inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] text-[9px] font-black px-1.5 shrink-0",
                isActive ? "bg-white text-primary" : "bg-primary text-white"
              )}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </div>
      {showDelete && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          className={cn(
            "shrink-0 rounded-[4px] p-1.5 transition-all opacity-0 group-hover:opacity-100 ml-1",
            isActive ? "text-white/60 hover:bg-white/20 hover:text-white" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

