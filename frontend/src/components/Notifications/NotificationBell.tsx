import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from './NotificationDropdown';
import { useUnreadCount } from '@/hooks/api/useNotifications';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationBellProps {
  userId: string;
  userRole?: string;
}

export function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useUnreadCount(userId);
  const queryClient = useQueryClient();
  const unreadCount = unreadData?.count ?? 0;

  useNotificationsSocket({
    userId,
    onUnreadCountUpdate: (count) => {
      queryClient.setQueryData(['notifications', 'unread', userId], { count });
    },
    onNotification: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <NotificationDropdown userId={userId} userRole={userRole} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
