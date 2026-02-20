'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { redirect } from 'next/navigation';
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
  Ban,
  ShieldCheck,
  Coins,
  Zap,
  UserX,
  Clock,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '@/hooks/api/useNotifications';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';
import { Notification, NotificationType } from '@/types/notification';
import { formatLocalTimestamp } from '@/lib/date-utils';

const notificationIcons: Record<NotificationType, React.ElementType> = {
  [NotificationType.RESOURCE_UNLOCK]: BookOpen,
  [NotificationType.QUIZ_REMINDER]: AlertCircle,
  [NotificationType.INCOMPLETE_RESOURCE]: AlertCircle,
  [NotificationType.ACHIEVEMENT_EARNED]: Trophy,
  [NotificationType.DISCUSSION_REPLY]: MessageSquare,
  [NotificationType.DISCUSSION_APPROVED]: CheckCircle2,
  [NotificationType.SESSION_REMINDER]: Calendar,
  [NotificationType.LEADERBOARD_UPDATE]: TrendingUp,
  [NotificationType.POINT_CAP_WARNING]: AlertCircle,
  [NotificationType.USER_REGISTERED]: CheckCircle2,
  [NotificationType.COHORT_CREATED]: BookOpen,
  [NotificationType.COHORT_UPDATED]: BookOpen,
  [NotificationType.RESOURCE_CREATED]: BookOpen,
  [NotificationType.RESOURCE_UPDATED]: BookOpen,
  [NotificationType.SESSION_CREATED]: Calendar,
  [NotificationType.SESSION_UPDATED]: Calendar,
  [NotificationType.USER_PROMOTED]: TrendingUp,
  [NotificationType.DISCUSSION_FLAGGED]: AlertCircle,
  [NotificationType.DISCUSSION_REJECTED]: Ban,
  [NotificationType.DISCUSSION_PENDING]: Clock,
  [NotificationType.SYSTEM_ALERT]: AlertCircle,
  [NotificationType.ATTENDANCE_MARKED]: CheckCircle2,
  [NotificationType.POINTS_ADJUSTED]: Coins,
  [NotificationType.USER_SUSPENDED]: Ban,
  [NotificationType.USER_UNSUSPENDED]: ShieldCheck,
  [NotificationType.QUIZ_STARTED]: Zap,
  [NotificationType.ANTI_SKIMMING_WARNING]: AlertCircle,
  [NotificationType.FELLOW_INACTIVITY]: UserX,
  [NotificationType.FELLOW_MISSED_SESSIONS]: UserX,
  [NotificationType.FELLOW_LOW_ENGAGEMENT]: AlertCircle,
  [NotificationType.PASSWORD_CHANGED]: KeyRound,
};

const notificationColors: Record<NotificationType, string> = {
  [NotificationType.RESOURCE_UNLOCK]: 'text-blue-500',
  [NotificationType.QUIZ_REMINDER]: 'text-orange-500',
  [NotificationType.INCOMPLETE_RESOURCE]: 'text-red-500',
  [NotificationType.ACHIEVEMENT_EARNED]: 'text-yellow-500',
  [NotificationType.DISCUSSION_REPLY]: 'text-purple-500',
  [NotificationType.DISCUSSION_APPROVED]: 'text-emerald-500',
  [NotificationType.SESSION_REMINDER]: 'text-green-500',
  [NotificationType.LEADERBOARD_UPDATE]: 'text-indigo-500',
  [NotificationType.POINT_CAP_WARNING]: 'text-amber-500',
  [NotificationType.USER_REGISTERED]: 'text-blue-500',
  [NotificationType.COHORT_CREATED]: 'text-blue-500',
  [NotificationType.COHORT_UPDATED]: 'text-blue-500',
  [NotificationType.RESOURCE_CREATED]: 'text-blue-500',
  [NotificationType.RESOURCE_UPDATED]: 'text-blue-500',
  [NotificationType.SESSION_CREATED]: 'text-green-500',
  [NotificationType.SESSION_UPDATED]: 'text-green-500',
  [NotificationType.USER_PROMOTED]: 'text-indigo-500',
  [NotificationType.DISCUSSION_FLAGGED]: 'text-red-500',
  [NotificationType.DISCUSSION_REJECTED]: 'text-red-500',
  [NotificationType.DISCUSSION_PENDING]: 'text-orange-500',
  [NotificationType.SYSTEM_ALERT]: 'text-amber-500',
  [NotificationType.ATTENDANCE_MARKED]: 'text-green-500',
  [NotificationType.POINTS_ADJUSTED]: 'text-amber-500',
  [NotificationType.USER_SUSPENDED]: 'text-red-500',
  [NotificationType.USER_UNSUSPENDED]: 'text-emerald-500',
  [NotificationType.QUIZ_STARTED]: 'text-purple-500',
  [NotificationType.ANTI_SKIMMING_WARNING]: 'text-red-500',
  [NotificationType.FELLOW_INACTIVITY]: 'text-orange-500',
  [NotificationType.FELLOW_MISSED_SESSIONS]: 'text-red-500',
  [NotificationType.FELLOW_LOW_ENGAGEMENT]: 'text-orange-500',
  [NotificationType.PASSWORD_CHANGED]: 'text-amber-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  if (!isAuthenticated || !user) {
    redirect('/login');
  }

  const { data, refetch } = useNotifications(user.id);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteAllMutation = useDeleteAllNotifications();

  useNotificationsSocket({
    userId: user.id,
    onNotification: () => refetch(),
    onUnreadCountUpdate: () => refetch(),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(user.id);
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleDeleteAll = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: () => setIsDeleteAllOpen(false),
    });
  };

  const getNotificationUrl = (notification: Notification) => {
    if (notification.data?.url) return notification.data.url as string;
    if (notification.data?.channelId) return `/dashboard/chat?channelId=${notification.data.channelId}`;
    if (notification.data?.discussionId) return `/dashboard/discussions/${notification.data.discussionId}`;
    if (notification.data?.resourceId) return `/resources/${notification.data.resourceId}`;
    if (notification.data?.sessionId) return `/dashboard/attendance`;
    if (notification.data?.liveQuizId) return `/dashboard/live-quiz/${notification.data.liveQuizId}`;
    if (notification.data?.quizId) return `/quiz/${notification.data.quizId}`;
    return null;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    const url = getNotificationUrl(notification);
    if (url) {
      router.push(url);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Notifications</h1>
          {notifications.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              {unreadCount > 0 && ` (${unreadCount} unread)`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteAllOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all
            </Button>
          )}
        </div>
      </div>

      <Card>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] ?? Bell;
              const iconColor = notificationColors[notification.type] ?? 'text-gray-400';

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
                            {formatLocalTimestamp(notification.createdAt)}
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
      </Card>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete all notifications?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteAllOpen(false)}
              disabled={deleteAllMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
