import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Discussion, DiscussionComment, CreateDiscussionRequest, CreateCommentRequest, PaginatedResponse } from '@/types/api';

export function useDiscussions(cohortId?: string, filters?: { pinned?: boolean; resourceId?: string }) {
  return useQuery({
    queryKey: ['discussions', cohortId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (filters?.pinned) params.append('pinned', 'true');
      if (filters?.resourceId) params.append('resourceId', filters.resourceId);
      
      const endpoint = `/discussions${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<PaginatedResponse<Discussion>>(endpoint);
    },
  });
}

export function useDiscussion(id: string) {
  return useQuery({
    queryKey: ['discussion', id],
    queryFn: () => apiClient.get<Discussion>(`/discussions/${id}`),
    enabled: !!id,
  });
}

export function useDiscussionComments(discussionId: string) {
  return useQuery({
    queryKey: ['discussion-comments', discussionId],
    queryFn: () => apiClient.get<DiscussionComment[]>(`/discussions/${discussionId}/comments`),
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiscussionRequest) =>
      apiClient.post<Discussion>('/discussions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('Discussion created!', 'Your post has been published');
    },
    onError: (error: any) => {
      toast.error('Failed to create discussion', error.message);
    },
  });
}

export function useCreateComment(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      apiClient.post<DiscussionComment>(`/discussions/${discussionId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      toast.success('Comment added!', '+10 points for engagement');
    },
    onError: (error: any) => {
      toast.error('Failed to add comment', error.message);
    },
  });
}

export function useLikeDiscussion(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(`/discussions/${discussionId}/like`, {}),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['discussion', discussionId] });
      const previousData = queryClient.getQueryData<Discussion>(['discussion', discussionId]);
      
      if (previousData) {
        queryClient.setQueryData<Discussion>(['discussion', discussionId], {
          ...previousData,
          likeCount: previousData.likeCount + 1,
        });
      }
      
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['discussion', discussionId], context.previousData);
      }
      toast.error('Failed to like', error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

// Get recent discussions for dashboard
export function useRecentDiscussions(limit: number = 5) {
  return useQuery({
    queryKey: ['discussions', 'recent', limit],
    queryFn: () => apiClient.get<Discussion[]>(`/discussions/recent?limit=${limit}`),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Admin-only: Toggle pin status
export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (discussionId: string) =>
      apiClient.post(`/discussions/${discussionId}/pin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success('Pin status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to toggle pin', error.message);
    },
  });
}

// Admin-only: Toggle lock status
export function useToggleLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (discussionId: string) =>
      apiClient.post(`/discussions/${discussionId}/lock`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success('Lock status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to toggle lock', error.message);
    },
  });
}
