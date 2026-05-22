"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Avatar from "@/components/shared/Avatar";
import { fetchApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProviderUi } from "@/components/provider/ProviderUiContext";
import { useProviderCall } from "@/components/provider/ProviderCallProvider";

type ThreadRow = {
  id: string;
  patientId?: string | null;
  patientName: string;
  patientAvatar?: string | null;
  status: string;
  visitType?: "VIDEO" | "AUDIO";
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageType?: string | null;
};

type ChatMessage = {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt: string;
  messageType?: "TEXT" | "CALL" | "MEDIA";
  attachments?: ChatAttachment[];
  callStatus?: "ANSWERED" | "NOT_ANSWERED" | "CANCELLED";
  callType?: "VIDEO" | "AUDIO";
  sender?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
};

type ChatAttachment = {
  key: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "file";
};

function sortMessages(items: ChatMessage[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function upsertMessage(items: ChatMessage[], incoming: ChatMessage) {
  if (items.some((item) => item.id === incoming.id)) return items;
  return sortMessages([...items, incoming]);
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [intentAction, setIntentAction] = useState<"chat" | "call" | null>(null);
  const [threadView, setThreadView] = useState<"active" | "history">("active");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingByThread, setTypingByThread] = useState<Record<string, boolean>>({});
  const [onlineByThread, setOnlineByThread] = useState<Record<string, boolean>>({});
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingSentRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const workspaceModeRef = useRef(false);
  const workspaceThreadIdsRef = useRef<Set<string>>(new Set());
  const outgoingCallRef = useRef<{
    appointmentId: string;
    callType: "VIDEO" | "AUDIO";
  } | null>(null);
  const { chatIntent, clearChatIntent, notify, patientWorkspace } = useProviderUi();
  const { ensureZego, setOutgoingHandlers } = useProviderCall();
  const workspaceMode = Boolean(patientWorkspace?.id);

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchApi("/providers/messages/threads");
        setThreads(Array.isArray(rows) ? rows : []);
      } catch {
        setThreads([]);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (chatIntent?.appointmentId) {
      setActiveThreadId(chatIntent.appointmentId);
      setMobileChatOpen(true);
      setIntentAction(chatIntent.action ?? "chat");
      clearChatIntent();
    }
  }, [chatIntent, clearChatIntent]);

  useEffect(() => {
    setActiveThreadId(null);
    setMessages([]);
    setMobileChatOpen(false);
  }, [patientWorkspace?.id]);

  const activeStatuses = useMemo(() => new Set(["REQUESTED", "ACCEPTED", "IN_PROGRESS"]), []);
  const historyStatuses = useMemo(() => new Set(["ENDED_BY_PROVIDER", "CONFIRMED", "RESOLVED"]), []);
  const scopedThreads = useMemo(
    () => (patientWorkspace?.id ? threads.filter((t) => t.patientId === patientWorkspace.id) : threads),
    [threads, patientWorkspace?.id]
  );
  const scopedThreadIds = useMemo(() => new Set(scopedThreads.map((thread) => thread.id)), [scopedThreads]);
  const threadMap = useMemo(
    () => Object.fromEntries(scopedThreads.map((thread) => [thread.id, thread])),
    [scopedThreads]
  );
  const activeThreads = useMemo(() => scopedThreads.filter((t) => activeStatuses.has(t.status)), [scopedThreads, activeStatuses]);
  const historyThreads = useMemo(() => scopedThreads.filter((t) => historyStatuses.has(t.status)), [scopedThreads, historyStatuses]);
  const visibleThreads = threadView === "active" ? activeThreads : historyThreads;
  const workspaceSendThread = useMemo(() => {
    if (!workspaceMode) return null;
    const requestedOrLive = scopedThreads.filter((thread) =>
      ["REQUESTED", "ACCEPTED", "IN_PROGRESS"].includes(thread.status)
    );
    const fromIntent = activeThreadId
      ? requestedOrLive.find((thread) => thread.id === activeThreadId) ?? null
      : null;
    return fromIntent ?? requestedOrLive[0] ?? null;
  }, [workspaceMode, scopedThreads, activeThreadId]);

  useEffect(() => {
    if (!scopedThreads.length || activeThreadId) return;
    const next = activeThreads[0] ?? historyThreads[0];
    if (next) setActiveThreadId(next.id);
  }, [scopedThreads, activeThreadId, activeThreads, historyThreads]);

  useEffect(() => {
    workspaceModeRef.current = workspaceMode;
    workspaceThreadIdsRef.current = scopedThreadIds;
  }, [workspaceMode, scopedThreadIds]);

  useEffect(() => {
    async function loadMe() {
      try {
        const me = await fetchApi("/providers/me");
        setMeId(me?.id ?? null);
      } catch {
        setMeId(null);
      }
    }
    loadMe();
  }, []);

  useEffect(() => {
    async function loadMessages() {
      if (workspaceMode) {
        if (!scopedThreads.length) {
          setMessages([]);
          return;
        }
        setLoadingMessages(true);
        try {
          const rows = await Promise.all(
            scopedThreads.map((thread) =>
              fetchApi(`/providers/messages/${thread.id}`).catch(() => [])
            )
          );
          const merged = rows.flatMap((row) => (Array.isArray(row) ? row : [])) as ChatMessage[];
          setMessages(sortMessages(merged));
        } catch {
          setMessages([]);
        } finally {
          setLoadingMessages(false);
        }
        return;
      }

      if (!activeThreadId) return;
      setLoadingMessages(true);
      try {
        const rows = await fetchApi(`/providers/messages/${activeThreadId}`);
        setMessages(Array.isArray(rows) ? rows : []);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }
    loadMessages();
  }, [activeThreadId, scopedThreads, workspaceMode]);

  const resetUnread = useCallback((threadId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[threadId]) return prev;
      return { ...prev, [threadId]: 0 };
    });
  }, []);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
    if (!activeThreadId) return;
    resetUnread(activeThreadId);
    setTypingByThread((prev) => ({ ...prev, [activeThreadId]: false }));
  }, [activeThreadId, resetUnread]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "https://proxima-health-backend.onrender.com";
    const socket = io(`${wsUrl}/messages`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      randomizationFactor: 0.3,
    });
    socketRef.current = socket;

    const handleMessage = (payload: { appointmentId: string; data: ChatMessage }) => {
      if (!payload?.appointmentId) return;
      if (
        workspaceModeRef.current &&
        workspaceThreadIdsRef.current.has(payload.appointmentId)
      ) {
        setMessages((prev) => upsertMessage(prev, payload.data));
        return;
      }
      if (payload.appointmentId === activeThreadRef.current) {
        setMessages((prev) => upsertMessage(prev, payload.data));
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [payload.appointmentId]: (prev[payload.appointmentId] ?? 0) + 1,
        }));
      }
    };

    const handleTyping = (payload: {
      appointmentId: string;
      data: { senderId: string; senderRole: string; isTyping: boolean };
    }) => {
      if (!payload?.appointmentId || payload.data?.senderRole === "PROVIDER") return;
      setTypingByThread((prev) => ({
        ...prev,
        [payload.appointmentId]: payload.data?.isTyping ?? false,
      }));
    };

    const handlePresence = (payload: {
      appointmentId: string;
      data: { userId: string; role: string; online: boolean };
    }) => {
      if (!payload?.appointmentId || payload.data?.role !== "PATIENT") return;
      setOnlineByThread((prev) => ({
        ...prev,
        [payload.appointmentId]: payload.data?.online ?? false,
      }));
    };

    socket.on("message", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("presence", handlePresence);
    socket.on("connect", () => {
      if (workspaceModeRef.current) {
        workspaceThreadIdsRef.current.forEach((appointmentId) => {
          socket.emit("join", { appointmentId });
        });
        return;
      }
      const current = activeThreadRef.current;
      if (current) socket.emit("join", { appointmentId: current });
    });

    return () => {
      socket.off("message", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("presence", handlePresence);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const roomIds = workspaceMode
      ? scopedThreads.map((thread) => thread.id)
      : activeThreadId
        ? [activeThreadId]
        : [];
    if (!roomIds.length) return;
    roomIds.forEach((roomId) => socket.emit("join", { appointmentId: roomId }));
    return () => {
      roomIds.forEach((roomId) => socket.emit("leave", { appointmentId: roomId }));
    };
  }, [activeThreadId, scopedThreads, workspaceMode]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const statusLabel = useMemo(
    () =>
      ({
        REQUESTED: "Requested",
        ACCEPTED: "Accepted",
        IN_PROGRESS: "In Progress",
        ENDED_BY_PROVIDER: "Ended",
        CONFIRMED: "Ended",
        RESOLVED: "Ended",
      }) as Record<string, string>,
    []
  );

  const activeThread = workspaceMode
    ? workspaceSendThread ?? scopedThreads[0] ?? null
    : scopedThreads.find((thread) => thread.id === activeThreadId) ?? null;
  const typingThreadId = workspaceMode ? workspaceSendThread?.id ?? null : activeThreadId;
  const typingActive = typingThreadId ? typingByThread[typingThreadId] : false;
  const onlineActive = typingThreadId ? onlineByThread[typingThreadId] : false;

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      const targetThreadId = workspaceMode ? workspaceSendThread?.id : activeThreadId;
      if (!targetThreadId) return;
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("typing", { appointmentId: targetThreadId, isTyping });
        return;
      }
      try {
        await fetchApi(`/providers/messages/${targetThreadId}/typing`, {
          method: "POST",
          body: JSON.stringify({ isTyping }),
        });
      } catch {
        // ignore
      }
    },
    [activeThreadId, workspaceMode, workspaceSendThread]
  );

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      const targetThreadId = workspaceMode ? workspaceSendThread?.id : activeThreadId;
      if (!targetThreadId) return;
      if (!typingSentRef.current) {
        typingSentRef.current = true;
        sendTyping(true);
      }
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        typingSentRef.current = false;
        sendTyping(false);
      }, 1200);
    },
    [activeThreadId, sendTyping, workspaceMode, workspaceSendThread]
  );

  const recordCallEvent = useCallback(
    async (appointmentId: string, callType: "VIDEO" | "AUDIO", callStatus: "ANSWERED" | "NOT_ANSWERED" | "CANCELLED") => {
      const payload = { callType, callStatus };
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("call-event", { appointmentId, ...payload });
        return;
      }
      try {
        const created = await fetchApi(`/messages/${appointmentId}/call-event`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessages((prev) => upsertMessage(prev, created));
      } catch (err) {
        console.error("call-event failed", err);
      }
    },
    []
  );

  useEffect(() => {
    setOutgoingHandlers({
      onAccepted: () => {
        const current = outgoingCallRef.current;
        if (!current) return;
        recordCallEvent(current.appointmentId, current.callType, "ANSWERED");
        outgoingCallRef.current = null;
      },
      onRejected: () => {
        const current = outgoingCallRef.current;
        if (!current) return;
        recordCallEvent(current.appointmentId, current.callType, "NOT_ANSWERED");
        outgoingCallRef.current = null;
      },
      onDeclined: () => {
        const current = outgoingCallRef.current;
        if (!current) return;
        recordCallEvent(current.appointmentId, current.callType, "NOT_ANSWERED");
        outgoingCallRef.current = null;
      },
      onTimeout: () => {
        const current = outgoingCallRef.current;
        if (!current) return;
        recordCallEvent(current.appointmentId, current.callType, "NOT_ANSWERED");
        outgoingCallRef.current = null;
      },
      onCanceled: () => {
        const current = outgoingCallRef.current;
        if (!current) return;
        recordCallEvent(current.appointmentId, current.callType, "CANCELLED");
        outgoingCallRef.current = null;
      },
    });
    return () => setOutgoingHandlers(null);
  }, [recordCallEvent, setOutgoingHandlers]);

  const handleCall = useCallback(
    async (isVideo: boolean) => {
      if (!activeThread || !activeThread.patientId) {
        notify("Patient information is not available for this chat.");
        return;
      }
      try {
        const { zp, zego } = await ensureZego();
        const callType = isVideo ? "VIDEO" : "AUDIO";
        const invitationType =
          zego.ZegoInvitationType ??
          zego.ZegoUIKitPrebuilt?.InvitationType ?? {
            VoiceCall: 0,
            VideoCall: 1,
          };
        await zp.sendCallInvitation({
          callees: [{ userID: activeThread.patientId.replace(/-/g, ""), userName: activeThread.patientName }],
          callType: isVideo ? invitationType.VideoCall : invitationType.VoiceCall,
          timeout: 90,
          roomID: activeThread.id,
        });
        outgoingCallRef.current = { appointmentId: activeThread.id, callType };
      } catch (err: any) {
        console.error("callInvite error", err);
        notify(err?.message || "Unable to start the call.");
      }
    },
    [activeThread, ensureZego, notify]
  );

  async function handleSend() {
    const targetThreadId = workspaceMode ? workspaceSendThread?.id : activeThreadId;
    if (!targetThreadId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("message", { appointmentId: targetThreadId, text });
        sendTyping(false);
        return;
      }
      const created = await fetchApi(`/providers/messages/${targetThreadId}`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setMessages((prev) => upsertMessage(prev, created));
      sendTyping(false);
    } catch (err: any) {
      notify(err?.message || "Failed to send message.");
      setDraft(text);
    }
  }

  async function handleAttachmentSelect(file?: File | null) {
    const targetThreadId = workspaceMode ? workspaceSendThread?.id : activeThreadId;
    if (!targetThreadId || !file) return;
    setUploadingAttachment(true);
    try {
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      const uploaded = await fetchApi(`/providers/messages/${targetThreadId}/attachments`, {
        method: "POST",
        body: uploadBody,
      });

      const attachment: ChatAttachment = {
        key: uploaded.key,
        url: uploaded.url,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        kind: uploaded.mimeType?.startsWith("image/") ? "image" : "file",
      };

      const created = await fetchApi(`/providers/messages/${targetThreadId}`, {
        method: "POST",
        body: JSON.stringify({
          text: draft.trim(),
          attachments: [attachment],
        }),
      });

      setMessages((prev) => upsertMessage(prev, created));
      setDraft("");
    } catch (err: any) {
      notify(err?.message || "Failed to send attachment.");
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  const downloadAttachment = useCallback(async (attachment: ChatAttachment) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const renderCallLabel = useCallback(
    (message: ChatMessage) => {
      if (message.callStatus === "ANSWERED") return "Answered";
      if (message.callStatus === "CANCELLED") return "Cancelled";
      if (message.callStatus === "NOT_ANSWERED") {
        if (meId && message.senderId === meId) return "Not answered";
        return "Missed";
      }
      return "Call";
    },
    [meId]
  );

  const renderCallType = useCallback((message: ChatMessage) => {
    if (message.callType === "VIDEO") return "Video call";
    if (message.callType === "AUDIO") return "Audio call";
    return "Call";
  }, []);

  const renderThreadList = (mobile: boolean) => (
    <Card
      className={cn(
        "h-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_16px_40px_rgba(15,23,42,0.08)] flex flex-col min-h-0",
        mobile && "rounded-none border-x-0 border-y-0 shadow-none h-[calc(100dvh-76px)] bg-[var(--color-surface)]"
      )}
    >
      <div className={cn("px-4 sm:px-5 pt-4 sm:pt-5", mobile && "sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4")}>
        <CardHeader
          title={threadView === "active" ? "Active Conversations" : "Conversation History"}
            subtitle={
              patientWorkspace
                ? `${patientWorkspace.name} only`
                : threadView === "active"
                  ? "Requested, accepted, or live appointments"
                  : "Ended, confirmed, or resolved"
            }
          actions={
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setThreadView((prev) => (prev === "active" ? "history" : "active"))}>
              {threadView === "active" ? "History" : "Active"}
            </Button>
          }
        />
      </div>
      <div className={cn("px-4 pb-4 space-y-3 flex-1 overflow-y-auto", mobile && "overscroll-contain px-4 py-4")}>
        {visibleThreads.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">
            {patientWorkspace
              ? `No ${threadView === "active" ? "active" : "historical"} chats for this patient yet.`
              : threadView === "active"
                ? "No active patient chats yet."
                : "No history yet."}
          </div>
        )}
        {visibleThreads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => {
              setActiveThreadId(thread.id);
              setMobileChatOpen(true);
              setIntentAction("chat");
              resetUnread(thread.id);
            }}
            className={cn(
              "w-full rounded-2xl border px-4 py-4 text-left transition-all",
              activeThreadId === thread.id
                ? "border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                : "border-transparent bg-[var(--color-surface-soft)] hover:border-[var(--color-border)]",
              mobile && "rounded-[24px] px-4 py-4"
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar
                initials={thread.patientName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                imageUrl={thread.patientAvatar ?? undefined}
                color="purple"
                size="sm"
                rounded
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold text-[var(--color-text)]">{thread.patientName}</div>
                  {unreadCounts[thread.id] ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-1 text-[10px] font-semibold text-[var(--color-on-primary)]">
                      {unreadCounts[thread.id]}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="line-clamp-1 text-xs text-[var(--color-text-muted)]">
                    {thread.lastMessage ? thread.lastMessage : statusLabel[thread.status] ?? thread.status}
                  </div>
                  <div className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {statusLabel[thread.status] ?? thread.status}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  const renderChatPane = (mobile: boolean) => (
    <Card
      className={cn(
        "flex flex-col min-h-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
        mobile && "rounded-none border-x-0 border-y-0 shadow-none h-[calc(100dvh-76px)]"
      )}
    >
      <div className={cn("px-4 sm:px-5 pt-4 sm:pt-5", mobile && "sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3")}>
        {mobile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {!workspaceMode && (
                <Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => setMobileChatOpen(false)}>
                  Back
                </Button>
              )}
              {activeThread ? (
                <Avatar
                  initials={activeThread.patientName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  imageUrl={activeThread.patientAvatar ?? undefined}
                  color="purple"
                  size="sm"
                  rounded
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[var(--color-text)]">
                  {workspaceMode ? patientWorkspace?.name ?? "Patient Chat" : activeThread?.patientName ?? "Chat"}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {workspaceMode
                    ? workspaceSendThread
                      ? "Full conversation history with this patient"
                      : "Past conversation history for this patient"
                    : activeThread
                      ? (onlineActive ? "Online now" : "Offline")
                      : "Select a conversation to start"}
                </div>
              </div>
            </div>
            {activeThread && workspaceSendThread && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => handleCall(true)}>
                  Video Call
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => handleCall(false)}>
                  Audio Call
                </Button>
              </div>
            )}
          </div>
        ) : (
          <CardHeader
            title={workspaceMode ? patientWorkspace?.name ?? "Patient Chat" : activeThread ? activeThread.patientName : "Chat"}
            subtitle={
              workspaceMode
                ? workspaceSendThread
                  ? "A single patient workspace conversation across current and previous appointments."
                  : "Viewing previous conversation history for this patient."
                : activeThread
                  ? (onlineActive ? "Online now" : "Offline")
                  : "Select a conversation to start"
            }
            actions={
              activeThread && workspaceSendThread ? (
                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleCall(true)}>
                    Video Call
                  </Button>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleCall(false)}>
                    Audio Call
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}
      </div>
      {!activeThread && (
        <div className="flex-1 flex items-center justify-center px-4 text-sm text-[var(--color-text-muted)]">
          {workspaceMode ? "No conversations yet for this patient." : "Select a conversation to view messages."}
        </div>
      )}
      {activeThread && (
        <>
          {intentAction === "call" && (
            <div className="mx-4 sm:mx-5 mt-1 rounded-xl border border-[var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] px-4 py-3 text-xs text-[var(--color-primary)]">
              Call intent received. The call SDK will plug in here when ready.
            </div>
          )}
          <div
            className={cn(
              "flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-[linear-gradient(180deg,rgba(148,163,184,0.08)_0%,transparent_100%)] min-h-0",
              mobile && "overscroll-contain bg-[linear-gradient(180deg,rgba(0,51,153,0.03)_0%,rgba(0,51,153,0.01)_100%)] px-3 py-4"
            )}
          >
            {loadingMessages && <div className="text-xs text-[var(--color-text-muted)]">Loading messages...</div>}
            {!loadingMessages && messages.length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)]">
                {workspaceSendThread
                  ? "No messages yet. Say hello to start the conversation."
                  : "No messages yet for this patient."}
              </div>
            )}
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const showSessionDivider =
                workspaceMode &&
                (!!previousMessage ? previousMessage.appointmentId !== message.appointmentId : true);
              const sessionThread = threadMap[message.appointmentId];
              if (message.messageType === "CALL") {
                const mine = meId ? message.senderId === meId : message.senderRole === "PROVIDER";
                return (
                  <div key={message.id} className="space-y-3">
                    {showSessionDivider && (
                      <div className="flex justify-center">
                        <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          {sessionThread?.status === "REQUESTED" ? "New booking started" : "Previous visit conversation"} · {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm border shadow-sm",
                          mine
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-text)] border-[var(--color-primary-soft-border)]"
                            : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]",
                          mobile && "max-w-[82%] rounded-[20px]"
                        )}
                      >
                        <div className="text-[10px] uppercase tracking-[0.25em] opacity-70 mb-1">{renderCallType(message)}</div>
                        <div className="text-sm font-semibold">{renderCallLabel(message)}</div>
                      </div>
                    </div>
                  </div>
                );
              }
              const mine = meId ? message.senderId === meId : message.senderRole === "PROVIDER";
              const senderName =
                message.sender?.firstName || message.sender?.lastName
                  ? `${message.sender?.firstName ?? ""} ${message.sender?.lastName ?? ""}`.trim()
                  : "Patient";
              return (
                <div key={message.id} className="space-y-3">
                  {showSessionDivider && (
                    <div className="flex justify-center">
                      <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        {sessionThread?.status === "REQUESTED" ? "New booking started" : "Previous visit conversation"} · {new Date(message.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        mine
                          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                          : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]",
                        mobile && "max-w-[82%] rounded-[22px] px-4 py-2.5"
                      )}
                    >
                      <div className="text-[10px] opacity-70 mb-1">{mine ? "You" : senderName}</div>
                      <div className="leading-relaxed">{message.text}</div>
                      {!!message.attachments?.length && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment) => (
                            <button
                              key={attachment.key}
                              type="button"
                              onClick={() => downloadAttachment(attachment)}
                              className={cn(
                                "block w-full overflow-hidden rounded-2xl border text-left",
                                mine ? "border-white/20 bg-white/10" : "border-[var(--color-border)] bg-[var(--color-surface-soft)]"
                              )}
                            >
                              {attachment.kind === "image" ? (
                                <img src={attachment.url} alt={attachment.name} className="h-40 w-full object-cover" />
                              ) : (
                                <div className="px-4 py-3 text-sm font-medium">{attachment.name}</div>
                              )}
                              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs opacity-80">
                                <span className="truncate">{attachment.name}</span>
                                <span>Download</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] opacity-60 mt-2">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
          {typingActive && workspaceSendThread && (
            <div className="px-4 sm:px-6 pb-2 text-xs text-[var(--color-text-muted)]">{activeThread.patientName} is typing...</div>
          )}
          <div className={cn("border-t border-[var(--color-border)] p-4 bg-[var(--color-surface)]", mobile && "sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/82 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]")}>
            <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:py-2 shadow-[0_8px_18px_rgba(15,23,42,0.06)]", mobile && "flex-row items-end gap-2 rounded-[28px] border-[var(--color-border)] px-3 py-2")}>
              <button
                type="button"
                className="h-11 w-11 shrink-0 rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)]"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploadingAttachment || !workspaceSendThread}
              >
                {uploadingAttachment ? "..." : "+"}
              </button>
              <input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder={workspaceSendThread ? "Type your message..." : "This conversation is read-only until the patient books again."}
                className={cn("flex-1 min-w-0 bg-transparent text-sm outline-none", mobile && "min-h-[42px] px-2")}
                onBlur={() => sendTyping(false)}
                disabled={!workspaceSendThread}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!workspaceSendThread}
                className={cn("w-full sm:w-auto bg-[var(--color-primary)] text-[var(--color-on-primary)]", mobile && "h-11 w-11 shrink-0 rounded-full px-0 text-xs")}
                onClick={handleSend}
              >
                Send
              </Button>
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleAttachmentSelect(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-h-[calc(100dvh-140px)] lg:h-[calc(100vh-220px)] lg:min-h-[560px]">
      <div className="hidden lg:block rounded-[28px] p-6 sm:p-7 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_58%),linear-gradient(120deg,var(--color-primary),var(--color-primary-hover))] text-[var(--color-on-primary)] shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--color-primary-contrast-soft)]">Physician Messages</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Clinical chat</h2>
            <p className="text-sm text-[var(--color-primary-contrast-soft)] mt-2 max-w-xl">
              Stay synced with patients in real time, securely and efficiently.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto bg-[var(--color-banner-veil)] border border-[var(--color-banner-border)] text-[var(--color-on-primary)] hover:bg-[var(--color-banner-veil-hover)]"
              onClick={() => notify("Support is on the way.")}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:hidden -mx-4 sm:mx-0 flex-1 min-h-0">
        {workspaceMode
          ? renderChatPane(true)
          : !mobileChatOpen || !activeThread
            ? renderThreadList(true)
            : renderChatPane(true)}
      </div>

      {workspaceMode ? (
        <div className="hidden lg:block flex-1 min-h-0">{renderChatPane(false)}</div>
      ) : (
        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 sm:gap-6 flex-1 min-h-0">
          {renderThreadList(false)}
          {renderChatPane(false)}
        </div>
      )}
    </div>
  );
}
