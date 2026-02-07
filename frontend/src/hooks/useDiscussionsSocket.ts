"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useDiscussionsSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Create socket connection
    const socketInstance = io(`${SOCKET_URL}/discussions`, {
      auth: {
        userId: user.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Connection event handlers
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

    // Cleanup on unmount
    return () => {
      console.log('[Discussions] Cleaning up socket connection');
      socketInstance.disconnect();
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
