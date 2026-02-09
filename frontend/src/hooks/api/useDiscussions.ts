import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Discussion, DiscussionComment, CreateDiscussionRequest, CreateCommentRequest, PaginatedResponse, CommentReactionType } from '@/types/api';

export interface DiscussionTopicOption {
  type: 'GENERAL' | 'SESSION' | 'RESOURCE';
  value: string;
  label: string;
}

export function useDiscussions(
  cohortId?: string,
  filters?: { pinned?: boolean; resourceId?: string; isApproved?: boolean },
) {
  return useQuery({
    queryKey: ['discussions', cohortId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (filters?.pinned) params.append('pinned', 'true');
      if (filters?.resourceId) params.append('resourceId', filters.resourceId);
      if (filters?.isApproved !== undefined) {
        params.append('isApproved', String(filters.isApproved));
      }
      
      const endpoint = `/discussions${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<PaginatedResponse<Discussion>>(endpoint);
    },
  });
}

export function useDiscussionTopics(cohortId?: string) {
  return useQuery({
    queryKey: ['discussion-topics', cohortId],
    queryFn: () => apiClient.get<DiscussionTopicOption[]>(`/discussions/topics?cohortId=${cohortId}`),
    enabled: !!cohortId,
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
    queryFn: async () => {
      const data = await apiClient.get<any>(`/discussions/${discussionId}/comments`);
      if (Array.isArray(data)) {
        return data as DiscussionComment[];
      }
      if (Array.isArray(data?.comments)) {
        return data.comments as DiscussionComment[];
      }
      return [] as DiscussionComment[];
    },
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiscussionRequest) =>
      apiClient.post<Discussion>('/discussions', data),
    onSuccess: (discussion) => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      if (discussion?.isApproved === false) {
        toast.success('Discussion submitted!', 'Awaiting facilitator approval');
      } else {
        toast.success('Discussion created!', 'Your post has been published');
      }
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

export function useToggleCommentPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.post(`/discussions/comments/${commentId}/pin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments'] });
      toast.success('Comment pin updated');
    },
    onError: (error: any) => {
      toast.error('Failed to pin comment', error.message);
    },
  });
}

export function useReactToComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, type }: { commentId: string; type: CommentReactionType }) =>
      apiClient.post(`/discussions/comments/${commentId}/reactions`, { type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments'] });
    },
    onError: (error: any) => {
      toast.error('Failed to react to comment', error.message);
    },
  });
}

export function useScoreCommentQuality(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.post(`/discussions/comments/${commentId}/score-quality`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      toast.success('Comment quality scored');
    },
    onError: (error: any) => {
      toast.error('Failed to score comment', error.message);
    },
  });
}

export function useToggleCommentQualityVisibility(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.post(`/discussions/comments/${commentId}/quality-visibility`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      toast.success('Comment quality visibility updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update comment visibility', error.message);
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

export function useApproveDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (discussionId: string) =>
      apiClient.post<Discussion>(`/discussions/${discussionId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success('Discussion approved');
    },
    onError: (error: any) => {
      toast.error('Failed to approve discussion', error.message);
    },
  });
}

// Admin/Facilitator: AI score discussion quality
export function useScoreDiscussionQuality(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<Discussion>(`/discussions/${discussionId}/score-quality`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('Quality score updated');
    },
    onError: (error: any) => {
      toast.error('Failed to score discussion', error.message);
    },
  });
}

export function useToggleDiscussionQualityVisibility(discussionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post(`/discussions/${discussionId}/quality-visibility`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('Quality visibility updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update visibility', error.message);
    },
  });
}
