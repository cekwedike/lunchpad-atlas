'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Channel } from '@/types/chat';

interface ChatPanelProps {
  cohortId: string;
  userId: string;
  userRole: 'ADMIN' | 'FACILITATOR' | 'FELLOW';
}

export function ChatPanel({ cohortId, userId, userRole }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col rounded-lg border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold">
            {activeChannel ? activeChannel.name : 'Chat'}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {!activeChannel ? (
          <ChannelList
            cohortId={cohortId}
            onSelectChannel={setActiveChannel}
          />
        ) : (
          <div className="flex flex-1 flex-col">
            <MessageList
              channelId={activeChannel.id}
              userId={userId}
              userRole={userRole}
              onBack={() => setActiveChannel(null)}
            />
            <MessageInput
              channelId={activeChannel.id}
              userId={userId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
