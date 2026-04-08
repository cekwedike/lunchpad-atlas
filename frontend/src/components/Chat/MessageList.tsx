'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Trash2, Flag, Pencil, Copy, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChannelMessages, useDeleteMessage, useEditMessage, useFlagMessage, useLinkPreview } from '@/hooks/api/useChat';
import type { ChatMessage } from '@/types/chat';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { firstUrl, linkifyText } from '@/lib/linkify';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const url = firstUrl(message.content);
  const { data: preview } = useLinkPreview(url || undefined);
  const editMessage = useEditMessage();

  const isEdited = useMemo(() => {
    try {
      return new Date(message.updatedAt).getTime() > new Date(message.createdAt).getTime();
    } catch {
      return false;
    }
  }, [message.createdAt, message.updatedAt]);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      // Best-effort fallback
      try {
        const el = document.createElement('textarea');
        el.value = message.content;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1200);
      } catch {
        // ignore
      }
    }
  };

  const beginEdit = () => {
    setDraft(message.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const next = draft.trim();
    if (!next) return;
    if (next === message.content) {
      setIsEditing(false);
      return;
    }
    editMessage.mutate(
      { messageId: message.id, content: next },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

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
            {isEdited && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
            {message.isFlagged && (
              <span className="text-xs text-yellow-600">⚠️ Flagged</span>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[84px] resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={4000}
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={editMessage.isPending || !draft.trim()}
                  className="w-full sm:w-auto"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={editMessage.isPending}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                {editMessage.isError && (
                  <span className="text-xs text-red-600">
                    Failed to save changes.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {linkifyText(message.content).map((part, idx) =>
                part.kind === 'link' ? (
                  <a
                    key={idx}
                    href={part.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {part.text}
                  </a>
                ) : (
                  <span key={idx}>{part.text}</span>
                ),
              )}
            </p>
          )}

          {preview && (preview.title || preview.description || preview.image) && (
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer noopener"
              className="block mt-3"
            >
              <Card className="border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
                <div className="flex gap-3">
                  {preview.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.image}
                      alt=""
                      className="w-24 h-24 object-cover bg-gray-100 shrink-0"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="p-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {preview.siteName && (
                        <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px]">
                          {preview.siteName}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground truncate">
                        {preview.url}
                      </span>
                    </div>
                    {preview.title && (
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {preview.title}
                      </div>
                    )}
                    {preview.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {preview.description}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </a>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 transition-opacity ${
                showActions ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              <span className="sr-only">Message actions</span>
              •••
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {copyState === 'copied' ? 'Copied' : 'Copy'}
            </DropdownMenuItem>

            {isOwnMessage && !isEditing && (
              <DropdownMenuItem onClick={beginEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}

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
      </div>
    </div>
  );
}
