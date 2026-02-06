import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Channel, ChatMessage, CreateChannelDto, SendMessageDto } from '@/types/chat';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==================== CHANNELS ====================

export function useCohortChannels(cohortId: string | undefined) {
  return useQuery<Channel[]>({
    queryKey: ['channels', cohortId],
    queryFn: async () => {
      if (!cohortId) throw new Error('Cohort ID required');
      
      const response = await fetch(`${API_BASE}/chat/channels/cohort/${cohortId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
    enabled: !!cohortId,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateChannelDto) => {
      const response = await fetch(`${API_BASE}/chat/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create channel');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.cohortId] });
    },
  });
}

export function useArchiveChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await fetch(`${API_BASE}/chat/channels/${channelId}/archive`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to archive channel');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// ==================== MESSAGES ====================

export function useChannelMessages(channelId: string | undefined, limit = 50) {
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', channelId, limit],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID required');
      
      const response = await fetch(
        `${API_BASE}/chat/messages/${channelId}?limit=${limit}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      const messages = await response.json();
      
      // Reverse to show oldest first
      return messages.reverse();
    },
    enabled: !!channelId,
    refetchInterval: 5000, // Poll every 5 seconds (WebSocket is better)
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SendMessageDto) => {
      const response = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useFlagMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`${API_BASE}/chat/messages/${messageId}/flag`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to flag message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
