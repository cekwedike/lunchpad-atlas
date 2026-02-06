'use client';

import { Hash, ChevronRight } from 'lucide-react';
import { useCohortChannels } from '@/hooks/api/useChat';
import type { Channel } from '@/types/chat';
import { Button } from '../ui/button';

interface ChannelListProps {
  cohortId: string;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ cohortId, onSelectChannel }: ChannelListProps) {
  const { data: channels, isLoading } = useCohortChannels(cohortId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading channels...</div>
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="text-sm text-muted-foreground">
          No channels available yet.
        </div>
      </div>
    );
  }

  // Group channels by type
  const cohortWideChannels = channels.filter(
    (ch) => ch.type === 'COHORT_WIDE'
  );
  const monthlyChannels = channels.filter((ch) => ch.type === 'MONTHLY_THEME');
  const sessionChannels = channels.filter(
    (ch) => ch.type === 'SESSION_SPECIFIC'
  );

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {/* Cohort-wide channels */}
      {cohortWideChannels.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            General
          </div>
          {cohortWideChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              onClick={() => onSelectChannel(channel)}
            />
          ))}
        </div>
      )}

      {/* Monthly theme channels */}
      {monthlyChannels.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Monthly Themes
          </div>
          {monthlyChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              onClick={() => onSelectChannel(channel)}
            />
          ))}
        </div>
      )}

      {/* Session-specific channels */}
      {sessionChannels.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Sessions
          </div>
          {sessionChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              onClick={() => onSelectChannel(channel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChannelItemProps {
  channel: Channel;
  onClick: () => void;
}

function ChannelItem({ channel, onClick }: ChannelItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
    >
      <Hash className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate text-left">{channel.name}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
