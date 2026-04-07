"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Users,
  MessageCircle,
  Reply,
  SmilePlus,
} from "lucide-react";
import { useAllChannels, useCohortChannels, useChannelMessages, useSendMessage, useChannelById, useToggleChannelLock, useMarkChannelRead, useChatMembers, useToggleMessageReaction } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useQueryClient } from "@tanstack/react-query";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import type { ChatMember, ChatMessage } from "@/types/chat";

export default function ChatRoomPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex items-center justify-center h-[calc(100vh-4rem)]"><p className="text-gray-500">Loading chat...</p></div></DashboardLayout>}>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      router.replace('/dashboard/chat');
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

  // Mark DM channel as read when opened
  useEffect(() => {
    if (mainChannel?.id && isDmChannel) {
      markChannelRead.mutate(mainChannel.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainChannel?.id, isDmChannel]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const renderMentions = useCallback((content: string) => {
    const parts: React.ReactNode[] = [];
    const re = /@([A-Za-z][A-Za-z0-9_.-]{1,32})/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const start = match.index;
      const end = re.lastIndex;
      if (start > lastIndex) parts.push(content.slice(lastIndex, start));
      parts.push(
        <span key={`${start}-${end}`} className="font-semibold underline underline-offset-2">
          {match[0]}
        </span>
      );
      lastIndex = end;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));
    return parts;
  }, []);

  const handleMessageInputChange = (value: string) => {
    setChatMessage(value);

    const atIndex = value.lastIndexOf('@');
    if (atIndex < 0) {
      setMentionOpen(false);
      setMentionQuery(null);
      return;
    }
    const after = value.slice(atIndex + 1);
    if (!after || /\s/.test(after)) {
      setMentionOpen(false);
      setMentionQuery(null);
      return;
    }
    setMentionQuery(after);
    setMentionOpen(true);
  };

  const filteredMentions = mentionOpen && mentionQuery
    ? (chatMembers as ChatMember[])
        .map((m) => ({ ...m, displayName: getDisplayName(m) }))
        .filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  const applyMention = (member: ChatMember) => {
    const displayName = getDisplayName(member);
    const atIndex = chatMessage.lastIndexOf('@');
    if (atIndex < 0) return;
    // Backend currently matches @FirstNameLastName (no spaces) by default.
    const token = displayName.replace(/\s+/g, '');
    const next = `${chatMessage.slice(0, atIndex)}@${token} `;
    setChatMessage(next);
    setMentionOpen(false);
    setMentionQuery(null);
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    try {
      await toggleReaction.mutateAsync({ messageId: message.id, emoji, channelId: message.channelId });
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong reacting to that message.";
      toast.error("Reaction failed", { description });
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] bg-gray-50 p-2 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/discussions')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Discussions
            </Button>
            <div className="flex flex-col items-end gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    tokenMissing || reconnectExhausted
                      ? 'bg-amber-500'
                      : isConnected
                        ? 'bg-green-500'
                        : 'bg-gray-400 animate-pulse'
                  }`}
                />
                <span className="text-gray-600 text-right sm:text-left">
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
                    className="h-7 text-xs"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                )}
              </div>
              {(tokenMissing || reconnectExhausted) && lastError && (
                <span className="text-amber-800 max-w-[220px] text-right leading-snug">
                  {lastError}
                </span>
              )}
            </div>
          </div>

          {/* Chat Card */}
          <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm">
            <CardHeader className="pb-3 border-b bg-blue-50 flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">
                        {isDmChannel ? (mainChannel?.description || 'Private Conversation') : cohortChatName}
                      </div>
                      {isDmChannel && (
                        <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    {!isDmChannel && mainChannel?.description && (
                      <div className="text-xs text-gray-600 font-normal">
                        {mainChannel.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {mainChannel?.isLocked && (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                      Locked
                    </Badge>
                  )}
                  {canManageChats && mainChannel && !isDmChannel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleChannelLock.mutate(mainChannel.id)}
                      disabled={toggleChannelLock.isPending}
                    >
                      {mainChannel.isLocked ? "Unlock" : "Lock"}
                    </Button>
                  )}
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <Users className="h-4 w-4 ml-1" />
                </div>
              </CardTitle>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="space-y-4">
                {messages && messages.length > 0 ? (
                  messages.map((message) => {
                    const isOwnMessage = message.userId === profile?.id;
                    const displayName = isOwnMessage
                      ? 'You'
                      : `${message.user?.firstName || 'Unknown'}${message.user?.lastName ? ` ${message.user.lastName}` : ''}`;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        ref={(el) => { messageRefs.current[message.id] = el; }}
                        id={`msg-${message.id}`}
                      >
                        <div className={`flex items-start gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <div className={`h-full w-full ${isOwnMessage ? 'bg-blue-600' : 'bg-purple-600'} flex items-center justify-center text-white text-sm font-medium`}>
                              {message.user?.firstName?.[0]}{message.user?.lastName?.[0]}
                            </div>
                          </Avatar>
                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-lg px-4 py-2 ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold ${isOwnMessage ? 'text-white/90' : 'text-gray-700'}`}>
                                  {displayName}
                                </span>
                                {message.user?.role && (
                                  <Badge className={`text-xs ${getRoleBadgeColor(message.user.role)}`}>
                                    {getRoleDisplayName(message.user.role)}
                                  </Badge>
                                )}
                              </div>
                              {message.parentMessage && (
                                <button
                                  type="button"
                                  onClick={() => jumpToMessage(message.parentMessage!.id)}
                                  className={`mb-2 w-full rounded-md border px-2 py-1 text-left text-xs ${
                                    isOwnMessage ? 'border-white/30 bg-white/10' : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <div className="truncate opacity-90">
                                    Replying to {message.parentMessage.user ? getDisplayName(message.parentMessage.user) : 'Unknown'}
                                  </div>
                                  <div className="truncate opacity-80">
                                    {message.parentMessage.content}
                                  </div>
                                </button>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{renderMentions(message.content)}</p>
                              <div className={`mt-2 flex flex-wrap items-center gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 text-xs ${isOwnMessage ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}`}
                                  onClick={() => setReplyTo(message)}
                                >
                                  <Reply className="h-3.5 w-3.5 mr-1" />
                                  Reply
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 text-xs ${isOwnMessage ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}`}
                                  onClick={() => void handleToggleReaction(message, '👍')}
                                  disabled={toggleReaction.isPending}
                                >
                                  <SmilePlus className="h-3.5 w-3.5 mr-1" />
                                  React
                                </Button>
                                {(message.reactions || []).map((r) => (
                                  <button
                                    key={r.emoji}
                                    type="button"
                                    onClick={() => void handleToggleReaction(message, r.emoji)}
                                    className={`ml-1 rounded-full border px-2 py-0.5 text-xs ${
                                      isOwnMessage ? 'border-white/30 bg-white/10' : 'border-gray-200 bg-white'
                                    } ${r.reactedByMe ? 'font-semibold' : ''}`}
                                    disabled={toggleReaction.isPending}
                                  >
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {formatLocalTimestamp(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-2">Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4 bg-white flex-shrink-0">
              {mainChannel?.isLocked && !canManageChats && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  This chat room is locked for announcements. You can read messages but cannot post.
                </div>
              )}
              {isAdminDmObserver && (
                <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  This is a private conversation. You can view but not participate.
                </div>
              )}
              {replyTo && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  <div className="min-w-0">
                    <div className="font-semibold">Replying to {replyTo.user ? getDisplayName(replyTo.user) : 'Unknown'}</div>
                    <div className="truncate text-blue-800/90">{replyTo.content}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => handleMessageInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full"
                    disabled={!mainChannel || (mainChannel.isLocked && !canManageChats) || isAdminDmObserver}
                  />
                  {filteredMentions.length > 0 && (
                    <div className="absolute bottom-12 left-0 z-20 w-full overflow-hidden rounded-md border bg-white shadow-md">
                      {filteredMentions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => applyMention(m)}
                        >
                          <span className="truncate font-medium">{m.displayName}</span>
                          <span className="ml-2 shrink-0 text-xs text-gray-500">{m.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || !mainChannel || sendMessage.isPending || (mainChannel.isLocked && !canManageChats) || isAdminDmObserver}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
