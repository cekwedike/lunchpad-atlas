import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchSocketAuthToken } from '@/lib/socket-auth';

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
  const [tokenMissing, setTokenMissing] = useState(false);
  const [reconnectExhausted, setReconnectExhausted] = useState(false);
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

  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onChannelDeletedRef = useRef(onChannelDeleted);
  const onChannelLockUpdatedRef = useRef(onChannelLockUpdated);
  const onUserTypingRef = useRef(onUserTyping);
  const onUserStoppedTypingRef = useRef(onUserStoppedTyping);
  onNewMessageRef.current = onNewMessage;
  onMessageDeletedRef.current = onMessageDeleted;
  onChannelDeletedRef.current = onChannelDeleted;
  onChannelLockUpdatedRef.current = onChannelLockUpdated;
  onUserTypingRef.current = onUserTyping;
  onUserStoppedTypingRef.current = onUserStoppedTyping;

  useEffect(() => {
    if (!userId) {
      setTokenMissing(false);
      setReconnectExhausted(false);
      setLastError(null);
      return;
    }
    let cancelled = false;

    setTokenMissing(false);
    setReconnectExhausted(false);
    setLastError(null);

    void (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled) return;
      if (!token) {
        setTokenMissing(true);
        setLastError(
          'Live chat needs an active login. Refresh the page or sign in again.'
        );
        return;
      }

      const socket = io(`${SOCKET_URL}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });
      if (cancelled) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setReconnectExhausted(false);
        setLastError(null);
        const pendingChannelId = pendingChannelRef.current;
        if (pendingChannelId) {
          socket.emit(
            'join_channel',
            { channelId: pendingChannelId },
            (response: any) => {
              if (response?.success) {
                joinedChannelRef.current = pendingChannelId;
                pendingChannelRef.current = null;
              } else if (response?.error) {
                setLastError(response.error);
              }
            }
          );
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('reconnect_attempt', () => {
        setReconnectExhausted(false);
      });

      socket.on('reconnect_failed', () => {
        setReconnectExhausted(true);
        setIsConnected(false);
        setLastError(
          (prev) =>
            prev ||
            'Could not reconnect to chat after several tries. Try refreshing the page.'
        );
      });

      socket.on('connect_error', (error) => {
        setIsConnected(false);
        setLastError(error?.message || 'Failed to connect to chat');
      });

      const nm = onNewMessageRef.current;
      if (nm) socket.on('new_message', nm);
      const md = onMessageDeletedRef.current;
      if (md) socket.on('message_deleted', md);
      const cd = onChannelDeletedRef.current;
      if (cd) socket.on('channel_deleted', cd);
      const cl = onChannelLockUpdatedRef.current;
      if (cl) socket.on('channel_lock_updated', cl);
      const ut = onUserTypingRef.current;
      if (ut) socket.on('user_typing', ut);
      const ust = onUserStoppedTypingRef.current;
      if (ust) socket.on('user_stopped_typing', ust);
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
    };
  }, [userId]);

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
    tokenMissing,
    reconnectExhausted,
  };
}
