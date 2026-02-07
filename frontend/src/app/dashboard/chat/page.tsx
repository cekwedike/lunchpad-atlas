"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { useCohortChannels, useChannelMessages, useSendMessage } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { formatRelativeTimeWAT, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";

export default function ChatRoomPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [chatMessage, setChatMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels } = useCohortChannels(profile?.cohortId);
  const mainChannel = channels?.[0];
  const cohortChatName = mainChannel?.name?.replace(/ - General Chat$/, '') || 'Cohort Chat';
  const { data: messages, refetch: refetchMessages } = useChannelMessages(mainChannel?.id);
  const sendMessage = useSendMessage();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (!mainChannel?.id) return;
    
    const interval = setInterval(() => {
      refetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [mainChannel?.id, refetchMessages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !mainChannel) return;
    
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
                <div className="flex items-center gap-1 text-sm text-gray-600">
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
                              {!isOwnMessage && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-700">
                                    {message.user?.firstName}
                                  </span>
                                  {message.user?.role && (
                                    <Badge className={`text-xs ${getRoleBadgeColor(message.user.role)}`}>
                                      {getRoleDisplayName(message.user.role)}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {formatRelativeTimeWAT(message.createdAt)}
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
              <div className="flex items-end gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={!mainChannel}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || !mainChannel || sendMessage.isPending}
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
