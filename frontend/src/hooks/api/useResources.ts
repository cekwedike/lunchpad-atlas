import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Resource, ResourceProgress, PaginatedResponse, MarkResourceCompleteRequest } from '@/types/api';

export function useResources(filters?: { sessionId?: string; cohortId?: string }) {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  return useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (filters?.sessionId) params.append('sessionId', filters.sessionId);
      if (filters?.cohortId) params.append('cohortId', filters.cohortId);
      const endpoint = `/resources?${params.toString()}`;
      const response = await apiClient.get<PaginatedResponse<Resource>>(endpoint);

      // Backend returns {data: Resource[], total, page, limit, totalPages}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data || [];
      }

      // Fallback if response structure is different
      return Array.isArray(response) ? response : [];
    },
    enabled: hasToken,
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

export interface TrackEngagementRequest {
  scrollDepth?: number;
  watchPercentage?: number;
  timeSpent?: number;
  eventType?: 'scroll' | 'video_progress' | 'time_update' | 'interaction';
  metadata?: string;
}

export interface TrackEngagementResponse {
  message: string;
  progress: ResourceProgress;
  canComplete: boolean;
}

export function useTrackEngagement(resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrackEngagementRequest) =>
      apiClient.post<TrackEngagementResponse>(`/resources/${resourceId}/track`, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['resource', resourceId], (oldData: any) => ({
        ...oldData,
        progress: response.progress,
        canComplete: response.canComplete,
      }));
    },
    onError: () => {
      // Silent fail for tracking - don't disrupt user experience
    },
  });
}
export function useAdminUnlockResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; resourceId: string }) =>
      apiClient.post('/resources/admin/unlock', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-progress'] });
      toast.success('Resource unlocked', 'Resource has been manually unlocked for the user');
    },
    onError: (error: any) => {
      toast.error('Failed to unlock resource', error.message);
    },
  });
}
