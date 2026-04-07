import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Channel, ChatMember, ChatMessage, CreateChannelDto, SendMessageDto } from '@/types/chat';
import { apiClient } from '@/lib/api-client';
import { useAuthSessionReady } from '@/hooks/useAuthSessionReady';

// ==================== CHANNELS ====================

export function useCohortChannels(cohortId: string | undefined) {
  const sessionReady = useAuthSessionReady();
  return useQuery<Channel[]>({
    queryKey: ['channels', cohortId],
    queryFn: async () => {
      if (!cohortId) throw new Error('Cohort ID required');

      return apiClient.get<Channel[]>(`/chat/channels/cohort/${cohortId}`);
    },
    enabled: !!cohortId && sessionReady,
    refetchInterval: 10000,
  });
}

export function useAllChannels(enabled: boolean) {
  const sessionReady = useAuthSessionReady();
  return useQuery<Channel[]>({
    queryKey: ['channels', 'all'],
    queryFn: async () => {
      return apiClient.get<Channel[]>('/chat/channels');
    },
    enabled: enabled && sessionReady,
    refetchInterval: enabled && sessionReady ? 10000 : false,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateChannelDto) => {
      return apiClient.post<Channel>('/chat/channels', data);
    },
    onSuccess: (createdChannel, variables) => {
      queryClient.setQueryData<Channel[]>(['channels', variables.cohortId], (current) => {
        if (!current) return current;
        if (current.some((channel) => channel.id === createdChannel.id)) return current;
        return [...current, createdChannel];
      });
      queryClient.setQueryData<Channel[]>(['channels', 'all'], (current) => {
        if (!current) return current;
        if (current.some((channel) => channel.id === createdChannel.id)) return current;
        return [...current, createdChannel];
      });
      queryClient.invalidateQueries({ queryKey: ['channels', variables.cohortId] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useArchiveChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiClient.patch<Channel>(`/chat/channels/${channelId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiClient.delete<Channel>(`/chat/channels/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['direct-channels'] });
    },
  });
}

export function useInitializeCohortChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cohortId: string) => {
      return apiClient.post<Channel[]>(`/chat/channels/initialize/${cohortId}`);
    },
    onSuccess: (_, cohortId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['channels', cohortId] });
    },
  });
}

export function useChannelById(channelId?: string, enabled: boolean = true) {
  const sessionReady = useAuthSessionReady();
  return useQuery<Channel>({
    queryKey: ['channels', 'by-id', channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID required');
      return apiClient.get<Channel>(`/chat/channels/${channelId}`);
    },
    enabled: enabled && !!channelId && sessionReady,
    refetchInterval: enabled && !!channelId && sessionReady ? 10000 : false,
  });
}

export function useToggleChannelLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiClient.patch<Channel>(`/chat/channels/${channelId}/lock`);
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'by-id', channelId] });
    },
  });
}

// ==================== MESSAGES ====================

export function useChannelMessages(channelId: string | undefined, limit = 50) {
  const sessionReady = useAuthSessionReady();
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', channelId, limit],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID required');

      const messages = await apiClient.get<ChatMessage[]>(
        `/chat/messages/${channelId}?limit=${limit}`
      );

      // Reverse to show oldest first
      return messages.reverse();
    },
    enabled: !!channelId && sessionReady,
    refetchInterval: !!channelId && sessionReady ? 5000 : false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SendMessageDto) => {
      return apiClient.post<ChatMessage>('/chat/messages', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'by-id', variables.channelId] });
    },
  });
}

export function useChatMembers(channelId: string | undefined) {
  const sessionReady = useAuthSessionReady();
  return useQuery<ChatMember[]>({
    queryKey: ['chat-members', channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID required');
      const members = await apiClient.get<ChatMember[]>(`/chat/members/${channelId}`);
      return Array.isArray(members) ? members : [];
    },
    enabled: !!channelId && sessionReady,
    staleTime: 30_000,
  });
}

export function useToggleMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { messageId: string; emoji: string; channelId: string }) => {
      return apiClient.post<{ channelId: string; messageId: string; reactions: any[] }>(
        `/chat/messages/${params.messageId}/reactions`,
        { emoji: params.emoji },
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['messages', result.channelId] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      return apiClient.delete<ChatMessage>(`/chat/messages/${messageId}`);
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
      return apiClient.patch<ChatMessage>(`/chat/messages/${messageId}/flag`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useOpenDM() {
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return apiClient.post<{ id: string }>(`/chat/direct/${targetUserId}`, {});
    },
  });
}

export function useAdminDirectChannels(enabled: boolean) {
  const sessionReady = useAuthSessionReady();
  return useQuery<any[]>({
    queryKey: ['direct-channels', 'admin'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/chat/direct');
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && sessionReady,
    refetchInterval: enabled && sessionReady ? 15000 : false,
  });
}

export function useMarkChannelRead() {
  return useMutation({
    mutationFn: (channelId: string) =>
      apiClient.patch(`/chat/channels/${channelId}/read`),
  });
}
