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
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const { userId, onNotification, onUnreadCountUpdate } = options;

  const onNotificationRef = useRef(onNotification);
  const onUnreadRef = useRef(onUnreadCountUpdate);
  onNotificationRef.current = onNotification;
  onUnreadRef.current = onUnreadCountUpdate;

  useEffect(() => {
    if (!userId) {
      setConnectionIssue(null);
      setIsConnected(false);
      return;
    }
    let cancelled = false;
    let socket: Socket | null = null;

    setConnectionIssue(null);

    void (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled) return;
      if (!token) {
        setConnectionIssue(
          'Instant alerts need an active login. Refresh the page or sign in again.'
        );
        return;
      }

      socket = io(`${SOCKET_URL}/notifications`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionIssue(null);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', (err: Error) => {
        setConnectionIssue(
          err?.message || 'Could not connect to notifications. You may still see updates when you open the bell.'
        );
      });

      socket.on('reconnect_failed', () => {
        setConnectionIssue(
          'Could not reconnect live notifications. Refresh the page to try again.'
        );
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
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.off('connect_error');
      socket?.off('reconnect_failed');
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return {
    isConnected,
    connectionIssue,
  };
}
