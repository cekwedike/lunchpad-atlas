import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '@/types/notification';
import { fetchSocketAuthToken } from '@/lib/socket-auth';

const RAW_SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
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
  const [isConnected, setIsConnected] = useState(false);
  const { userId, onNotification, onUnreadCountUpdate } = options;

  const onNotificationRef = useRef(onNotification);
  const onUnreadRef = useRef(onUnreadCountUpdate);
  onNotificationRef.current = onNotification;
  onUnreadRef.current = onUnreadCountUpdate;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let socket: Socket | null = null;

    void (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled || !token) return;

      socket = io(`${SOCKET_URL}/notifications`, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Notifications socket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Notifications socket disconnected');
        setIsConnected(false);
      });

      const n = onNotificationRef.current;
      if (n) socket.on('new_notification', n);

      const u = onUnreadRef.current;
      if (u) {
        socket.on('unread_count_update', (payload: { count: number }) => {
          u(payload.count);
        });
      }
    })();

    return () => {
      cancelled = true;
      setIsConnected(false);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return {
    isConnected,
  };
}
