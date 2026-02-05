import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Resource, ResourceProgress, PaginatedResponse, MarkResourceCompleteRequest } from '@/types/api';

import { useAuthStore } from '@/stores/authStore';

export function useResources(sessionId?: string) {
  const { isGuestMode } = useAuthStore();
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  
  return useQuery({
    queryKey: ['resources', sessionId],
    queryFn: async () => {
      const endpoint = sessionId ? `/resources?sessionId=${sessionId}` : '/resources';
      return apiClient.get<Resource[]>(endpoint);
    },
    enabled: hasToken && !isGuestMode,
    retry: false,
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => apiClient.get<Resource>(`/resources/${id}`),
    enabled: !!id,
  });
}

export function useResourceProgress(userId?: string) {
  return useQuery({
    queryKey: ['resource-progress', userId],
    queryFn: async () => {
      const endpoint = userId ? `/resource-progress?userId=${userId}` : '/resource-progress/me';
      return apiClient.get<ResourceProgress[]>(endpoint);
    },
  });
}

export function useMarkResourceComplete(resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: MarkResourceCompleteRequest) =>
      apiClient.post<ResourceProgress>(`/resources/${resourceId}/complete`, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-progress'] });
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Resource completed!', 'Points have been awarded');
    },
    onError: (error: any) => {
      toast.error('Failed to mark complete', error.message);
    },
  });
}

export function useUpdateResourceProgress(resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progress: { progress: number; lastPosition?: number }) =>
      apiClient.patch<ResourceProgress>(`/resources/${resourceId}/progress`, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-progress'] });
    },
  });
}
