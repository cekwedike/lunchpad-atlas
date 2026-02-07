import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/v1\/?$/, '');

interface UseChatSocketOptions {
  userId: string;
  channelId?: string;
  onNewMessage?: (message: any) => void;
  onMessageDeleted?: (data: { messageId: string; channelId: string }) => void;
  onUserTyping?: (data: { userId: string; channelId: string }) => void;
  onUserStoppedTyping?: (data: { userId: string; channelId: string }) => void;
}

/**
 * Hook for managing WebSocket connection to chat
 */
export function useChatSocket(options: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const {
    userId,
    channelId,
    onNewMessage,
    onMessageDeleted,
    onUserTyping,
    onUserStoppedTyping,
  } = options;

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(`${SOCKET_URL}/chat`, {
      auth: {
        userId,
      },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Chat socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Chat socket disconnected');
    });

    // Message events
    if (onNewMessage) {
      socket.on('new_message', onNewMessage);
    }

    if (onMessageDeleted) {
      socket.on('message_deleted', onMessageDeleted);
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
      socket.disconnect();
    };
  }, [userId, onNewMessage, onMessageDeleted, onUserTyping, onUserStoppedTyping]);

  // Join channel
  useEffect(() => {
    if (!channelId || !socketRef.current) return;

    const socket = socketRef.current;
    socket.emit('join_channel', { channelId });

    return () => {
      socket.emit('leave_channel', { channelId });
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
    isConnected: socketRef.current?.connected ?? false,
  };
}
