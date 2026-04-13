"use client";

import { Suspense, useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Send,
  Users,
  MessageCircle,
  Reply,
  Sparkles,
  Eye,
} from "lucide-react";
import { useAllChannels, useCohortChannels, useChannelMessages, useSendMessage, useChannelById, useToggleChannelLock, useMarkChannelRead, useChatMembers, useToggleMessageReaction, useLinkPreview } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useQueryClient } from "@tanstack/react-query";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import type { ChatMember, ChatMessage } from "@/types/chat";
import { getChatMentionRegex } from "@/lib/chat-mentions";
import { ChatReactionGlyph, reactionLabelForStored } from "@/lib/chat-reactions";
import { cn } from "@/lib/utils";
import { firstUrl, linkifyText } from "@/lib/linkify";

const ChatReaction3DPicker = dynamic(
  () =>
    import("@/components/Chat/ChatReaction3DPicker").then(
      (m) => m.ChatReaction3DPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[220px] w-[min(100vw-2rem,280px)] animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/80"
        aria-hidden
      />
    ),
  },
);

export default function ChatRoomPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout fullBleedContent>
          <div className="flex flex-1 items-center justify-center min-h-[50vh]">
            <p className="text-gray-500">Loading chat...</p>
          </div>
        </DashboardLayout>
      }
    >
      <ChatRoomContent />
    </Suspense>
  );
}

function ChatRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const [chatMessage, setChatMessage] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const queryClient = useQueryClient();

  const isAdmin = profile?.role === 'ADMIN';
  const canManageChats = isAdmin || profile?.role === 'FACILITATOR';
  const cohortId = (profile?.cohortId ?? undefined) as string | undefined;
  const { data: cohortChannels } = useCohortChannels(cohortId);
  const { data: allChannels } = useAllChannels(isAdmin);
  const channels = isAdmin ? allChannels : cohortChannels;
  const selectedChannelId = searchParams.get('channelId');
  const channelFromList = selectedChannelId
    ? channels?.find((channel) => channel.id === selectedChannelId)
    : channels?.[0];
  const { data: channelById } = useChannelById(selectedChannelId || undefined, !!selectedChannelId && !channelFromList);
  const mainChannel = channelFromList ?? channelById;
  const isDmChannel = mainChannel?.type === 'DIRECT_MESSAGE';
  // True only when an admin is viewing a DM they are NOT a participant in
  const isAdminDmObserver = isDmChannel && isAdmin &&
    !!profile?.id && !(mainChannel?.name ?? '').includes(profile.id);
  const cohortChatName = mainChannel?.name || mainChannel?.cohort?.name || 'Cohort Chat';
  const { data: messages, refetch: refetchMessages } = useChannelMessages(mainChannel?.id);
  const sendMessage = useSendMessage();
  const toggleChannelLock = useToggleChannelLock();
  const markChannelRead = useMarkChannelRead();
  const toggleReaction = useToggleMessageReaction();
  const { data: chatMembers = [] } = useChatMembers(mainChannel?.id);

  const handleSocketNewMessage = useCallback((message: ChatMessage) => {
    if (!mainChannel?.id || message.channelId !== mainChannel.id) return;

    queryClient.setQueryData<ChatMessage[]>(['messages', mainChannel.id, 50], (current) => {
      if (!current) return [message];
      if (current.some((existing) => existing.id === message.id)) return current;
      return [...current, message];
    });
  }, [mainChannel?.id, queryClient]);

  const handleSocketMessageDeleted = useCallback((data: { messageId: string; channelId: string }) => {
    if (!mainChannel?.id || data.channelId !== mainChannel.id) return;

    queryClient.setQueryData<ChatMessage[]>(['messages', mainChannel.id, 50], (current) => {
      if (!current) return current;
      return current.filter((message) => message.id !== data.messageId);
    });
  }, [mainChannel?.id, queryClient]);

  const handleChannelDeleted = useCallback((data: { channelId: string }) => {
    queryClient.setQueryData(['channels', cohortId], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.filter((channel) => channel.id !== data.channelId);
    });
    queryClient.setQueryData(['channels', 'all'], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.filter((channel) => channel.id !== data.channelId);
    });
    queryClient.removeQueries({ queryKey: ['channels', 'by-id', data.channelId] });
    queryClient.removeQueries({ queryKey: ['messages', data.channelId] });

    if (mainChannel?.id === data.channelId) {
      toast.info('Chat room deleted', { description: 'This room was removed by an admin.' });
      router.replace('/dashboard/chats');
    }
  }, [cohortId, mainChannel?.id, queryClient, router]);

  const handleChannelLockUpdated = useCallback((data: { channelId: string; isLocked: boolean }) => {
    const updateChannel = (channel: any) => {
      if (!channel || channel.id !== data.channelId) return channel;
      return { ...channel, isLocked: data.isLocked };
    };

    queryClient.setQueryData(['channels', cohortId], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.map(updateChannel);
    });
    queryClient.setQueryData(['channels', 'all'], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.map(updateChannel);
    });
    queryClient.setQueryData(['channels', 'by-id', data.channelId], (current: any) => {
      if (!current) return current;
      return updateChannel(current);
    });
  }, [cohortId, queryClient]);

  const handleSocketReactionsUpdated = useCallback((data: { channelId: string; messageId: string; reactions: any[] }) => {
    if (!mainChannel?.id || data.channelId !== mainChannel.id) return;
    queryClient.setQueryData<ChatMessage[]>(['messages', mainChannel.id, 50], (current) => {
      if (!current) return current;
      return current.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
    });
  }, [mainChannel?.id, queryClient]);

  const { isConnected, lastError, tokenMissing, reconnectExhausted } = useChatSocket({
    userId: profile?.id || "",
    channelId: mainChannel?.id,
    onNewMessage: handleSocketNewMessage,
    onMessageDeleted: handleSocketMessageDeleted,
    onMessageReactionsUpdated: handleSocketReactionsUpdated,
    onChannelDeleted: handleChannelDeleted,
    onChannelLockUpdated: handleChannelLockUpdated,
  });

  const messageIdsKey = messages?.map((m) => m.id).join(",") ?? "";

  // Mark visible messages as read (read receipts / seen-by)
  useEffect(() => {
    if (!mainChannel?.id || !messageIdsKey || isAdminDmObserver) return;
    const ids = messages!.map((m) => m.id);
    const t = window.setTimeout(() => {
      markChannelRead.mutate({ channelId: mainChannel.id, messageIds: ids });
    }, 1500);
    return () => clearTimeout(t);
    // markChannelRead.mutate is stable from useMutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainChannel?.id, messageIdsKey, isAdminDmObserver, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!mainChannel?.id || !lastError) return;
    refetchMessages();
  }, [mainChannel?.id, lastError, refetchMessages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !mainChannel) return;

    if (mainChannel.isLocked && !canManageChats) {
      toast.error("Chat is locked", { description: "This room is read-only right now." });
      return;
    }
    
    try {
      await sendMessage.mutateAsync({ 
        channelId: mainChannel.id, 
        parentMessageId: replyTo?.id || undefined,
        content: chatMessage,
      });
      setChatMessage("");
      setReplyTo(null);
      setMentionOpen(false);
      setMentionQuery(null);
      setTimeout(() => refetchMessages(), 500);
      toast.success("Message sent!");
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong. Check your connection and try again.";
      toast.error("Failed to send message", { description });
    }
  };

  const syncComposerHeight = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.min(220, typeof window !== "undefined" ? window.innerHeight * 0.38 : 220);
    el.style.height = `${Math.min(max, Math.max(44, el.scrollHeight))}px`;
  }, []);

  useEffect(() => {
    syncComposerHeight();
  }, [chatMessage, syncComposerHeight]);

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const jumpToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current[messageId] || document.getElementById(`msg-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const getDisplayName = useCallback((member: { firstName?: string; lastName?: string }) => {
    const first = member.firstName || '';
    const last = member.lastName || '';
    return `${first}${last ? ` ${last}` : ''}`.trim() || 'Unknown';
  }, []);

  const hashString = useCallback((s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }, []);

  /**
   * Single cohesive color scheme (blue/indigo), with deterministic per-token shades
   * so different people can have distinct colors without clashing.
   */
  const mentionStyleForToken = useCallback((rawToken: string) => {
    const compact = rawToken.toLowerCase().replace(/\s+/g, "");
    const isEveryone = compact === "everyone" || compact === "all";

    const hue = 220; // single scheme
    const shadeIndex = hashString(compact) % 6; // 0..5
    const lightnessSteps = [92, 88, 84, 80, 76, 72];
    const lightness = isEveryone ? 84 : lightnessSteps[shadeIndex];
    const fgLightness = isEveryone ? 28 : 24;
    const borderLightness = isEveryone ? 68 : 70;

    return {
      backgroundColor: `hsl(${hue} 90% ${lightness}%)`,
      color: `hsl(${hue} 45% ${fgLightness}%)`,
      borderColor: `hsl(${hue} 70% ${borderLightness}%)`,
    } as React.CSSProperties;
  }, [hashString]);

  const mentionTokensInComposer = (() => {
    const re = getChatMentionRegex();
    const out = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(chatMessage)) !== null) out.add(m[1]);
    return Array.from(out).slice(0, 6);
  })();

  const renderMentions = useCallback((content: string) => {
    const parts: React.ReactNode[] = [];
    const re = getChatMentionRegex();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const start = match.index;
      const end = re.lastIndex;
      if (start > lastIndex) parts.push(content.slice(lastIndex, start));
      parts.push(
        <span
          key={`${start}-${end}`}
          className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-semibold"
          style={mentionStyleForToken(match[1]) as CSSProperties}
        >
          {match[0]}
        </span>,
      );
      lastIndex = end;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));
    return parts;
  }, [mentionStyleForToken]);

  const renderLinkifiedMentions = useCallback(
    (content: string, isOwnMessage: boolean) =>
      linkifyText(content).map((part, idx) =>
        part.kind === "link" ? (
          <a
            key={`${part.href}-${idx}`}
            href={part.href}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "underline underline-offset-2 break-all",
              isOwnMessage
                ? "text-white/95 decoration-white/60 hover:text-white"
                : "text-blue-700 decoration-blue-200 hover:text-blue-800",
            )}
          >
            {part.text}
          </a>
        ) : (
          <span key={`${idx}-${part.text.slice(0, 8)}`}>{renderMentions(part.text)}</span>
        ),
      ),
    [renderMentions],
  );

  function MessageBody({
    content,
    isOwnMessage,
  }: {
    content: string;
    isOwnMessage: boolean;
  }) {
    const url = firstUrl(content);
    const { data: preview } = useLinkPreview(url || undefined);

    return (
      <>
        <p
          className={`text-[15px] leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-sm ${
            isOwnMessage ? "text-white" : "text-slate-800"
          }`}
        >
          {renderLinkifiedMentions(content, isOwnMessage)}
        </p>

        {preview && (preview.title || preview.description || preview.image) && (
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block mt-3"
          >
            <Card
              className={cn(
                "overflow-hidden border transition-colors",
                isOwnMessage
                  ? "border-white/20 bg-white/10 hover:border-white/30"
                  : "border-slate-200 hover:border-slate-300 bg-white",
              )}
            >
              <div className="flex gap-3">
                {preview.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.image}
                    alt=""
                    className={cn(
                      "w-24 h-24 object-cover shrink-0",
                      isOwnMessage ? "bg-white/10" : "bg-slate-100",
                    )}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="p-3 min-w-0">
                  <div className="flex items-center gap-2 mb-1 min-w-0">
                    {preview.siteName && (
                      <Badge
                        className={cn(
                          "text-[10px] shrink-0",
                          isOwnMessage
                            ? "border-white/20 bg-white/10 text-white/90"
                            : "bg-gray-50 text-gray-700 border-gray-200",
                        )}
                      >
                        {preview.siteName}
                      </Badge>
                    )}
                    <span
                      className={cn(
                        "text-[10px] truncate",
                        isOwnMessage ? "text-white/75" : "text-slate-500",
                      )}
                    >
                      {preview.url}
                    </span>
                  </div>
                  {preview.title && (
                    <div
                      className={cn(
                        "text-sm font-semibold line-clamp-2",
                        isOwnMessage ? "text-white" : "text-slate-900",
                      )}
                    >
                      {preview.title}
                    </div>
                  )}
                  {preview.description && (
                    <div
                      className={cn(
                        "text-xs mt-1 line-clamp-2",
                        isOwnMessage ? "text-white/80" : "text-slate-600",
                      )}
                    >
                      {preview.description}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </a>
        )}
      </>
    );
  }

  const handleMessageInputChange = (value: string) => {
    setChatMessage(value);

    const atIndex = value.lastIndexOf('@');
    if (atIndex < 0) {
      setMentionOpen(false);
      setMentionQuery(null);
      return;
    }
    const after = value.slice(atIndex + 1);
    const lineAfter = after.split("\n")[0];
    if (lineAfter === "") {
      setMentionQuery("");
      setMentionOpen(true);
      return;
    }
    if (lineAfter[0] === " ") {
      setMentionOpen(false);
      setMentionQuery(null);
      return;
    }
    const segment = lineAfter.split(/[\s,;.!?()[\]{}]/)[0].trim();
    setMentionQuery(segment);
    setMentionOpen(true);
  };

  const filteredMentions = (() => {
    if (!mentionOpen || mentionQuery === null) return [];

    const q = mentionQuery.toLowerCase();
    const base = (chatMembers as ChatMember[]).map((m) => ({
      ...m,
      displayName: getDisplayName(m),
    }));
    const filtered =
      q === ""
        ? base.slice(0, 8)
        : base.filter((m) => m.displayName.toLowerCase().includes(q));

    const includeEveryone =
      q === "" || "everyone".includes(q) || "all".includes(q);
    const special = includeEveryone
      ? [{ id: '__everyone__', firstName: 'everyone', lastName: '', role: '', displayName: 'everyone' } as any]
      : [];

    return [...special, ...filtered].slice(0, 8);
  })();

  const applyMention = (member: ChatMember) => {
    if ((member as any).id === '__everyone__') {
      const atIndex = chatMessage.lastIndexOf('@');
      if (atIndex < 0) return;
      const next = `${chatMessage.slice(0, atIndex)}@everyone `;
      setChatMessage(next);
      setMentionOpen(false);
      setMentionQuery(null);
      return;
    }
    const displayName = (member.firstName || getDisplayName(member)).trim();
    const atIndex = chatMessage.lastIndexOf('@');
    if (atIndex < 0) return;
    const token = displayName.replace(/\s+/g, " ").trim();
    const next = `${chatMessage.slice(0, atIndex)}@${token} `;
    setChatMessage(next);
    setMentionOpen(false);
    setMentionQuery(null);
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    try {
      await toggleReaction.mutateAsync({
        messageId: message.id,
        emoji,
        channelId: message.channelId,
      });
      setReactionPickerFor(null);
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong reacting to that message.";
      toast.error("Reaction failed", { description });
    }
  };

  return (
    <DashboardLayout fullBleedContent>
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {/* Keep header static while only chat messages scroll. */}
        <div className="z-30 shrink-0">
          <div className="border-b border-slate-200/50 bg-white/65 shadow-[0_8px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.05] backdrop-blur-xl supports-[backdrop-filter]:bg-white/50">
            <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3 lg:px-8">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/chats')}
                className="h-10 w-full touch-manipulation justify-start gap-2 rounded-xl text-slate-700 hover:bg-white/80 sm:h-9 sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">Back to All Chats</span>
              </Button>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-slate-600">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-md">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      tokenMissing || reconnectExhausted
                        ? 'bg-amber-500'
                        : isConnected
                          ? 'bg-emerald-500'
                          : 'bg-slate-400 animate-pulse'
                    }`}
                  />
                  <span className="font-medium">
                    {tokenMissing || reconnectExhausted
                      ? 'Could not connect'
                      : isConnected
                        ? 'Live'
                        : 'Reconnecting…'}
                  </span>
                  {(tokenMissing || reconnectExhausted) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 touch-manipulation px-2 text-xs"
                      onClick={() => window.location.reload()}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
                {(tokenMissing || reconnectExhausted) && lastError && (
                  <span className="max-w-full text-right text-[11px] leading-snug text-amber-800 sm:max-w-[240px]">
                    {lastError}
                  </span>
                )}
              </div>
            </div>

            <header className="px-3 py-3.5 sm:px-6 sm:py-4 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 ring-1 ring-white/20">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                        {mainChannel
                          ? isDmChannel
                            ? (mainChannel?.description || 'Private Conversation')
                            : cohortChatName
                          : 'Chat Room'}
                      </span>
                      {isDmChannel && (
                        <Badge className="shrink-0 border-purple-200/80 bg-purple-50 text-purple-700 text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    {!isDmChannel && mainChannel?.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        {mainChannel.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {mainChannel?.isLocked && (
                    <Badge className="border-amber-200/90 bg-amber-50 text-amber-900">
                      Locked
                    </Badge>
                  )}
                  {canManageChats && mainChannel && !isDmChannel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 touch-manipulation rounded-xl border-slate-200/90 bg-white/70 backdrop-blur-sm"
                      onClick={() => toggleChannelLock.mutate(mainChannel.id)}
                      disabled={toggleChannelLock.isPending}
                    >
                      {mainChannel.isLocked ? "Unlock" : "Lock"}
                    </Button>
                  )}
                  <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            </header>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 min-w-0 flex-1 bg-slate-50/95 [&_[data-radix-scroll-area-viewport]]:min-w-0 [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden">
              <div className="min-w-0 max-w-full space-y-1 overflow-x-hidden px-2.5 py-2.5 sm:space-y-2 sm:px-4 sm:py-4 md:px-5">
                {messages && messages.length > 0 ? (
                  messages.map((message) => {
                    const isOwnMessage = message.userId === profile?.id;
                    const displayName = isOwnMessage
                      ? 'You'
                      : `${message.user?.firstName || 'Unknown'}${message.user?.lastName ? ` ${message.user.lastName}` : ''}`;
                    return (
                      <div
                        key={message.id}
                        className={`flex w-full min-w-0 max-w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        ref={(el) => { messageRefs.current[message.id] = el; }}
                        id={`msg-${message.id}`}
                      >
                        {/* Row: no w-max — percentage max-widths break on mobile WebKit inside shrink-to-fit rows */}
                        <div
                          className={`flex min-w-0 max-w-[min(100%,calc(100vw-2.5rem))] items-end gap-1.5 sm:max-w-[min(100%,26rem)] sm:gap-2.5 md:max-w-[min(100%,30rem)] lg:max-w-[min(100%,36rem)] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <Avatar className="h-7 w-7 shrink-0 touch-manipulation ring-2 ring-white sm:h-9 sm:w-9">
                            <div
                              className={`flex h-full w-full items-center justify-center text-[10px] font-semibold text-white sm:text-xs ${isOwnMessage ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'}`}
                            >
                              {message.user?.firstName?.[0]}
                              {message.user?.lastName?.[0]}
                            </div>
                          </Avatar>
                          <div
                            className={`flex min-w-0 flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`w-full min-w-0 rounded-2xl px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 ${
                                isOwnMessage
                                  ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/15'
                                  : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.04]'
                              }`}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-1.5 gap-y-0.5">
                                <span className={`text-[11px] font-semibold tracking-tight sm:text-xs ${isOwnMessage ? 'text-white/95' : 'text-slate-800'}`}>
                                  {displayName}
                                </span>
                                {message.user?.role && (
                                  <Badge className={`text-[10px] sm:text-xs ${getRoleBadgeColor(message.user.role)}`}>
                                    {getRoleDisplayName(message.user.role)}
                                  </Badge>
                                )}
                              </div>
                              {message.parentMessage && (
                                <button
                                  type="button"
                                  onClick={() => jumpToMessage(message.parentMessage!.id)}
                                  className={`mb-2 w-full min-w-0 rounded-lg border-l-[3px] px-2.5 py-2 text-left text-[11px] leading-snug touch-manipulation sm:text-xs ${
                                    isOwnMessage
                                      ? 'border-white/70 bg-black/15 text-white/95'
                                      : 'border-blue-500/80 bg-slate-100/95 text-slate-800'
                                  }`}
                                >
                                  <div className="font-medium opacity-95">
                                    Replying to {message.parentMessage.user ? getDisplayName(message.parentMessage.user) : 'Unknown'}
                                  </div>
                                  <div className="mt-0.5 line-clamp-3 break-words [overflow-wrap:anywhere] opacity-90">
                                    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                      {renderLinkifiedMentions(message.parentMessage.content, isOwnMessage)}
                                    </span>
                                  </div>
                                </button>
                              )}
                              <MessageBody content={message.content} isOwnMessage={isOwnMessage} />
                              <div
                                className={`mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-9 min-h-9 touch-manipulation rounded-lg px-2.5 text-xs sm:h-8 ${isOwnMessage ? 'text-white/90 hover:bg-white/15 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                  onClick={() => setReplyTo(message)}
                                >
                                  <Reply className="mr-1 h-3.5 w-3.5" />
                                  Reply
                                </Button>
                                <Popover
                                  open={reactionPickerFor === message.id}
                                  onOpenChange={(open) =>
                                    setReactionPickerFor(open ? message.id : null)
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className={`h-9 min-h-9 touch-manipulation rounded-lg px-2.5 text-xs sm:h-8 ${isOwnMessage ? 'text-white/90 hover:bg-white/15 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                      disabled={toggleReaction.isPending}
                                    >
                                      <Sparkles className="mr-1 h-3.5 w-3.5 opacity-90" />
                                      React
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[min(100vw-2rem,300px)] rounded-2xl border-slate-200/80 bg-white p-2.5 shadow-xl"
                                    align="start"
                                    side="top"
                                  >
                                    <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      Tap an emoji
                                    </p>
                                    <ChatReaction3DPicker
                                      disabled={toggleReaction.isPending}
                                      onSelect={(id) => {
                                        setReactionPickerFor(null);
                                        void handleToggleReaction(message, id);
                                      }}
                                    />
                                    <p className="mt-1.5 px-0.5 text-center text-[10px] leading-snug text-slate-400">
                                      Like · Love · Laugh · Fire · Celebrate · Hype · Agree · Top
                                    </p>
                                  </PopoverContent>
                                </Popover>
                                {(message.reactions || []).map((r) => (
                                  <button
                                    key={r.emoji}
                                    type="button"
                                    onClick={() => void handleToggleReaction(message, r.emoji)}
                                    className={`inline-flex touch-manipulation items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium sm:px-2.5 ${
                                      isOwnMessage
                                        ? 'border-white/35 bg-white/15 text-white/95'
                                        : 'border-slate-200/90 bg-white text-slate-800 shadow-sm'
                                    } ${r.reactedByMe ? 'ring-1 ring-blue-400/50' : ''}`}
                                    disabled={toggleReaction.isPending}
                                    title={reactionLabelForStored(r.emoji)}
                                    aria-label={`${reactionLabelForStored(r.emoji)} · ${r.count}`}
                                  >
                                    <ChatReactionGlyph
                                      storedKey={r.emoji}
                                      isOwnMessage={isOwnMessage}
                                      size={14}
                                    />
                                    <span className="tabular-nums">{r.count}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={`mt-1.5 flex max-w-full min-w-0 flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              <time
                                className="text-[10px] tabular-nums text-slate-500 sm:text-xs"
                                dateTime={new Date(message.createdAt).toISOString()}
                              >
                                {formatLocalTimestamp(message.createdAt)}
                              </time>
                              {(message.readByCount ?? 0) > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-slate-200/90 bg-white py-1 pl-2 pr-2.5 text-left text-[10px] text-slate-600 shadow-sm touch-manipulation transition-colors hover:bg-slate-50 active:bg-slate-100 sm:text-xs"
                                    >
                                      <Eye className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                      <span className="truncate">
                                        {message.readByCount} read
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[min(calc(100vw-2rem),18rem)] p-3 text-sm"
                                    align={isOwnMessage ? 'end' : 'start'}
                                    side="top"
                                  >
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Seen by
                                    </p>
                                    <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm text-slate-800">
                                      {message.readBy?.map((u) => (
                                        <li key={u.id} className="leading-snug">
                                          {u.firstName}
                                          {u.lastName ? ` ${u.lastName}` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-w-0 flex-col items-center justify-center px-4 py-16 text-center text-slate-500">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/80 text-slate-500 shadow-inner ring-1 ring-white/60">
                      <MessageCircle className="h-8 w-8" />
                    </div>
                    <p className="font-semibold text-slate-800">No messages yet</p>
                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
                      Start the conversation — your cohort will see it here.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-slate-200/70 bg-white px-3 py-2.5 sm:px-6 sm:py-4 lg:px-8">
              {mainChannel?.isLocked && !canManageChats && (
                <div className="mb-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-3 py-2.5 text-xs leading-relaxed text-amber-900 shadow-sm">
                  This chat room is locked for announcements. You can read messages but cannot post.
                </div>
              )}
              {isAdminDmObserver && (
                <div className="mb-3 rounded-2xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                  This is a private conversation. You can view but not participate.
                </div>
              )}
              {replyTo && (
                <div className="mb-3 flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-blue-100/90 bg-blue-50/95 px-3 py-2.5 text-xs text-blue-950 shadow-sm">
                  <div className="min-w-0">
                    <div className="font-semibold">Replying to {replyTo.user ? getDisplayName(replyTo.user) : 'Unknown'}</div>
                    <div className="line-clamp-3 whitespace-pre-wrap break-words text-blue-900/80">{replyTo.content}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 touch-manipulation px-2"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {mentionTokensInComposer.length > 0 && (
                <div className="mb-2 flex min-w-0 flex-wrap gap-1.5">
                  {mentionTokensInComposer.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold"
                      style={mentionStyleForToken(t) as CSSProperties}
                    >
                      @{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex min-w-0 items-end gap-2">
                <div className="relative min-w-0 flex-1">
                  <Textarea
                    ref={composerRef}
                    placeholder="Write a message…"
                    value={chatMessage}
                    onChange={(e) => handleMessageInputChange(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    aria-label="Message composer"
                    className="min-h-[44px] max-h-[min(220px,38vh)] resize-none overflow-y-auto rounded-2xl border-slate-200/90 bg-white/90 px-3.5 py-2.5 text-base leading-relaxed shadow-inner ring-1 ring-slate-900/[0.04] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 sm:min-h-[44px] sm:px-4 sm:py-3 sm:text-sm"
                    disabled={!mainChannel || (mainChannel.isLocked && !canManageChats) || isAdminDmObserver}
                  />
                  {filteredMentions.length > 0 && (
                    <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 max-h-[min(40vh,16rem)] w-full min-w-0 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur-sm">
                      {filteredMentions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="flex w-full touch-manipulation items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-slate-50 active:bg-slate-100"
                          onClick={() => applyMention(m)}
                        >
                          <span className="truncate font-medium">{m.displayName}</span>
                          <span className="ml-2 shrink-0 text-xs text-slate-500">{m.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  onClick={() => void handleSendMessage()}
                  disabled={!chatMessage.trim() || !mainChannel || sendMessage.isPending || (mainChannel.isLocked && !canManageChats) || isAdminDmObserver}
                  className="h-11 w-11 shrink-0 touch-manipulation self-end rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 transition hover:from-blue-500 hover:to-indigo-600 disabled:opacity-60 sm:h-11 sm:w-11"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 hidden text-center text-[11px] text-slate-400 sm:block">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-sans text-[10px]">Ctrl</kbd>
                {" + "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-sans text-[10px]">Enter</kbd>
                {" to send · Enter alone for a new line"}
              </p>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
