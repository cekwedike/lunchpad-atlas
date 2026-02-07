import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '@/types/notification';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UseNotificationsSocketOptions {
  userId: string;
  onNotification?: (notification: Notification) => void;
  onNotificationRead?: (notificationId: string) => void;
}

/**
 * Hook for managing WebSocket connection to notifications
 */
export function useNotificationsSocket(options: UseNotificationsSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { userId, onNotification, onNotificationRead } = options;

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(`${SOCKET_URL}/notifications`, {
      auth: {
        userId,
      },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Notifications socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Notifications socket disconnected');
    });

    // Notification events
    if (onNotification) {
      socket.on('notification', onNotification);
    }

    if (onNotificationRead) {
      socket.on('notification_read', onNotificationRead);
    }

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [userId, onNotification, onNotificationRead]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('mark_read', { notificationId });
  }, []);

  return {
    markAsRead,
    isConnected: socketRef.current?.connected ?? false,
  };
}
