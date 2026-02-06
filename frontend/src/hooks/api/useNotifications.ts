import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Notification, NotificationResponse } from '@/types/notification';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Fetch notifications
export function useNotifications(userId: string) {
  return useQuery<NotificationResponse>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notifications?userId=${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Fetch unread count
export function useUnreadCount(userId: string) {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread', userId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notifications/unread-count?userId=${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Mark notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
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
      const response = await fetch(`${API_URL}/notifications/mark-all-read?userId=${userId}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
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
      const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
