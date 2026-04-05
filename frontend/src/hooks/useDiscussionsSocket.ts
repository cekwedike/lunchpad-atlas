"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { fetchSocketAuthToken } from '@/lib/socket-auth';

const RAW_SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/v1\/?$/, '');

export function useDiscussionsSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let socketInstance: Socket | null = null;

    void (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled || !token) return;

      socketInstance = io(`${SOCKET_URL}/discussions`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
      if (cancelled) {
        socketInstance.disconnect();
        return;
      }

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('[Discussions] Connected to WebSocket');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('[Discussions] Disconnected from WebSocket');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('[Discussions] Connection error:', error);
        setIsConnected(false);
      });
    })();

    return () => {
      cancelled = true;
      const active = socketRef.current;
      if (active) {
        try {
          active.removeAllListeners();
          active.disconnect();
        } catch {
          /* ignore */
        }
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id]);

  const subscribeToDiscussion = (discussionId: string) => {
    if (socket && isConnected) {
      socket.emit('discussion:subscribe', { discussionId });
    }
  };

  const unsubscribeFromDiscussion = (discussionId: string) => {
    if (socket && isConnected) {
      socket.emit('discussion:unsubscribe', { discussionId });
    }
  };

  const emitTyping = (discussionId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('discussion:typing', { discussionId, isTyping });
    }
  };

  return {
    socket,
    isConnected,
    subscribeToDiscussion,
    unsubscribeFromDiscussion,
    emitTyping,
  };
}
