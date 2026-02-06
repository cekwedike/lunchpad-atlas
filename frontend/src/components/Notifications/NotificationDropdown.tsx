import { useEffect } from 'react';
import {
  Bell,
  BookOpen,
  Trophy,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/api/useNotifications';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';
import { Notification, NotificationType } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
  [NotificationType.RESOURCE_UNLOCK]: BookOpen,
  [NotificationType.QUIZ_REMINDER]: AlertCircle,
  [NotificationType.INCOMPLETE_RESOURCE]: AlertCircle,
  [NotificationType.ACHIEVEMENT_EARNED]: Trophy,
  [NotificationType.DISCUSSION_REPLY]: MessageSquare,
  [NotificationType.SESSION_REMINDER]: Calendar,
  [NotificationType.LEADERBOARD_UPDATE]: TrendingUp,
  [NotificationType.POINT_CAP_WARNING]: AlertCircle,
};

const notificationColors: Record<NotificationType, string> = {
  [NotificationType.RESOURCE_UNLOCK]: 'text-blue-500',
  [NotificationType.QUIZ_REMINDER]: 'text-orange-500',
  [NotificationType.INCOMPLETE_RESOURCE]: 'text-red-500',
  [NotificationType.ACHIEVEMENT_EARNED]: 'text-yellow-500',
  [NotificationType.DISCUSSION_REPLY]: 'text-purple-500',
  [NotificationType.SESSION_REMINDER]: 'text-green-500',
  [NotificationType.LEADERBOARD_UPDATE]: 'text-indigo-500',
  [NotificationType.POINT_CAP_WARNING]: 'text-amber-500',
};

export function NotificationDropdown({ userId, onClose }: NotificationDropdownProps) {
  const { data, refetch } = useNotifications(userId);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // WebSocket integration
  useNotificationsSocket({
    userId,
    onNotification: (notification) => {
      refetch();
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(userId);
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Handle navigation based on notification type and data
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
    
    onClose();
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({unreadCount} unread)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const iconColor = notificationColors[notification.type];
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-muted/50 cursor-pointer transition-colors group',
                    !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className={cn('mt-0.5', iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            !notification.isRead && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => handleDelete(notification.id, e)}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/notifications';
                onClose();
              }}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
