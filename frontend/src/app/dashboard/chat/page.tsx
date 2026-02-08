"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { useAllChannels, useCohortChannels, useChannelMessages, useSendMessage, useChannelById, useToggleChannelLock } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useQueryClient } from "@tanstack/react-query";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";
import type { ChatMessage } from "@/types/chat";

export default function ChatRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const [chatMessage, setChatMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  const cohortChatName = mainChannel?.name || mainChannel?.cohort?.name || 'Cohort Chat';
  const { data: messages, refetch: refetchMessages } = useChannelMessages(mainChannel?.id);
  const sendMessage = useSendMessage();
  const toggleChannelLock = useToggleChannelLock();

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

  const { isConnected, lastError } = useChatSocket({
    userId: profile?.id || "",
    channelId: mainChannel?.id,
    onNewMessage: handleSocketNewMessage,
    onMessageDeleted: handleSocketMessageDeleted,
  });

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
        content: chatMessage 
      });
      setChatMessage("");
      setTimeout(() => refetchMessages(), 500);
      toast.success("Message sent!");
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] bg-gray-50 p-6">
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
            <div className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-600">
                {isConnected ? 'Live' : 'Reconnecting'}
              </span>
            </div>
          </div>

          {/* Chat Card */}
          <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm">
            <CardHeader className="pb-3 border-b bg-blue-50 flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-semibold text-lg">
                      {cohortChatName}
                    </div>
                    {mainChannel?.description && (
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
                  {canManageChats && mainChannel && (
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
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
              <div className="flex items-end gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={!mainChannel || (mainChannel.isLocked && !canManageChats)}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || !mainChannel || sendMessage.isPending || (mainChannel.isLocked && !canManageChats)}
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
