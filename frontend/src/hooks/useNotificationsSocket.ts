import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '@/types/notification';

const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/v1\/?$/, '');

interface UseNotificationsSocketOptions {
  userId: string;
  onNotification?: (notification: Notification) => void;
  onUnreadCountUpdate?: (count: number) => void;
}

/**
 * Hook for managing WebSocket connection to notifications
 */
export function useNotificationsSocket(options: UseNotificationsSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { userId, onNotification, onUnreadCountUpdate } = options;

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    socketRef.current = io(`${SOCKET_URL}/notifications`, {
      auth: {
        token,
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
      socket.on('new_notification', onNotification);
    }

    if (onUnreadCountUpdate) {
      socket.on('unread_count_update', (payload: { count: number }) => {
        onUnreadCountUpdate(payload.count);
      });
    }

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [userId, onNotification, onUnreadCountUpdate]);

  return {
    isConnected: socketRef.current?.connected ?? false,
  };
}
