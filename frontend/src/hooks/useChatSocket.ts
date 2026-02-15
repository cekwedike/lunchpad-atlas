import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/v1\/?$/, '');

interface UseChatSocketOptions {
  userId: string;
  channelId?: string;
  onNewMessage?: (message: any) => void;
  onMessageDeleted?: (data: { messageId: string; channelId: string }) => void;
  onChannelDeleted?: (data: { channelId: string; cohortId?: string }) => void;
  onChannelLockUpdated?: (data: { channelId: string; cohortId?: string; isLocked: boolean }) => void;
  onUserTyping?: (data: { userId: string; channelId: string }) => void;
  onUserStoppedTyping?: (data: { userId: string; channelId: string }) => void;
}

/**
 * Hook for managing WebSocket connection to chat
 */
export function useChatSocket(options: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const joinedChannelRef = useRef<string | null>(null);
  const pendingChannelRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const {
    userId,
    channelId,
    onNewMessage,
    onMessageDeleted,
    onChannelDeleted,
    onChannelLockUpdated,
    onUserTyping,
    onUserStoppedTyping,
  } = options;

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    socketRef.current = io(`${SOCKET_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setLastError(null);
      const pendingChannelId = pendingChannelRef.current;
      if (pendingChannelId) {
        socket.emit('join_channel', { channelId: pendingChannelId }, (response: any) => {
          if (response?.success) {
            joinedChannelRef.current = pendingChannelId;
            pendingChannelRef.current = null;
          } else if (response?.error) {
            setLastError(response.error);
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      setLastError(error?.message || 'Failed to connect to chat');
    });

    // Message events
    if (onNewMessage) {
      socket.on('new_message', onNewMessage);
    }

    if (onMessageDeleted) {
      socket.on('message_deleted', onMessageDeleted);
    }

    if (onChannelDeleted) {
      socket.on('channel_deleted', onChannelDeleted);
    }

    if (onChannelLockUpdated) {
      socket.on('channel_lock_updated', onChannelLockUpdated);
    }

    // Typing events
    if (onUserTyping) {
      socket.on('user_typing', onUserTyping);
    }

    if (onUserStoppedTyping) {
      socket.on('user_stopped_typing', onUserStoppedTyping);
    }

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('new_message');
      socket.off('message_deleted');
      socket.off('channel_deleted');
      socket.off('channel_lock_updated');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.disconnect();
    };
  }, [userId, onNewMessage, onMessageDeleted, onChannelDeleted, onChannelLockUpdated, onUserTyping, onUserStoppedTyping]);

  // Join channel
  useEffect(() => {
    if (!channelId || !socketRef.current) return;

    const socket = socketRef.current;

    if (joinedChannelRef.current && joinedChannelRef.current !== channelId) {
      socket.emit('leave_channel', { channelId: joinedChannelRef.current });
      joinedChannelRef.current = null;
    }

    if (socket.connected) {
      socket.emit('join_channel', { channelId }, (response: any) => {
        if (response?.success) {
          joinedChannelRef.current = channelId;
        } else if (response?.error) {
          setLastError(response.error);
        }
      });
    } else {
      pendingChannelRef.current = channelId;
    }

    return () => {
      if (socket.connected) {
        socket.emit('leave_channel', { channelId });
      }
      if (pendingChannelRef.current === channelId) {
        pendingChannelRef.current = null;
      }
      if (joinedChannelRef.current === channelId) {
        joinedChannelRef.current = null;
      }
    };
  }, [channelId]);

  // Send message
  const sendMessage = useCallback((channelId: string, content: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('send_message', {
      channelId,
      content,
    });
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('delete_message', { messageId });
  }, []);

  // Typing indicators
  const startTyping = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing_start', { channelId });
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing_stop', { channelId });
  }, []);

  return {
    sendMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    isConnected,
    lastError,
  };
}
