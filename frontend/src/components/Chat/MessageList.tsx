'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Trash2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChannelMessages, useDeleteMessage, useFlagMessage } from '@/hooks/api/useChat';
import type { ChatMessage } from '@/types/chat';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface MessageListProps {
  channelId: string;
  userId: string;
  userRole: 'ADMIN' | 'FACILITATOR' | 'FELLOW';
  onBack: () => void;
}

export function MessageList({ channelId, userId, userRole, onBack }: MessageListProps) {
  const { data: messages, isLoading } = useChannelMessages(channelId);
  const deleteMessage = useDeleteMessage();
  const flagMessage = useFlagMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDelete = (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage.mutate(messageId);
    }
  };

  const handleFlag = (messageId: string) => {
    flagMessage.mutate(messageId);
  };

  const canModerate = userRole === 'ADMIN' || userRole === 'FACILITATOR';

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to channels
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages || messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.userId === userId}
              canModerate={canModerate}
              onDelete={() => handleDelete(message.id)}
              onFlag={() => handleFlag(message.id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  canModerate: boolean;
  onDelete: () => void;
  onFlag: () => void;
}

function MessageItem({ message, isOwnMessage, canModerate, onDelete, onFlag }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);

  if (message.isDeleted) {
    return (
      <div className="text-sm italic text-muted-foreground">
        [Message deleted]
      </div>
    );
  }

  const displayName = message.user
    ? `${message.user.firstName} ${message.user.lastName}`
    : 'Unknown User';

  const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className="group relative rounded-lg p-3 hover:bg-accent/50 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {message.isFlagged && (
              <span className="text-xs text-yellow-600">⚠️ Flagged</span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {showActions && (isOwnMessage || canModerate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <span className="sr-only">Message actions</span>
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(isOwnMessage || canModerate) && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
              {canModerate && !message.isFlagged && (
                <DropdownMenuItem onClick={onFlag}>
                  <Flag className="mr-2 h-4 w-4" />
                  Flag
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
