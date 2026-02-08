import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Notification, NotificationResponse } from '@/types/notification';
import { apiClient } from '@/lib/api-client';

// Fetch notifications
export function useNotifications(userId: string) {
  return useQuery<NotificationResponse>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const data = await apiClient.get<any>('/notifications');
      const notifications = Array.isArray(data) ? data : (data?.notifications ?? []);
      const unreadCount = Array.isArray(data)
        ? data.filter((item: Notification) => !item.isRead).length
        : (data?.unreadCount ?? 0);
      const total = Array.isArray(data) ? notifications.length : (data?.total ?? notifications.length);

      return { notifications, total, unreadCount };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Fetch unread count
export function useUnreadCount(userId: string) {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread', userId],
    queryFn: async () => {
      return apiClient.get<{ count: number }>('/notifications/unread-count');
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Mark notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: (_, notificationId) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Mark all as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return apiClient.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
