'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useSendMessage } from '@/hooks/api/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface MessageInputProps {
  channelId: string;
  userId: string;
}

export function MessageInput({ channelId, userId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const sendMessage = useSendMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket for real-time (currently disabled until socket.io-client is installed)
  const { startTyping, stopTyping } = useChatSocket({
    userId,
    channelId,
  });

  // Handle typing indicators (disabled until WebSocket is active)
  useEffect(() => {
    // Note: startTyping/stopTyping are currently no-ops until socket.io-client is installed
    // Uncomment this logic after installing socket.io-client
    /*
    if (isTyping) {
      startTyping(channelId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(channelId);
      }, 3000);
    } else {
      stopTyping(channelId);
    }
    */

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, channelId]);

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    sendMessage.mutate(
      {
        channelId,
        content: trimmedContent,
      },
      {
        onSuccess: () => {
          setContent('');
          setIsTyping(false);
          // stopTyping is a no-op until WebSocket is active
          textareaRef.current?.focus();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    if (!isTyping && content.trim()) {
      setIsTyping(true);
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={sendMessage.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || sendMessage.isPending}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
