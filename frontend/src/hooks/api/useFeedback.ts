import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export type FeedbackType = 'SUGGESTION' | 'BUG_REPORT' | 'CONCERN' | 'GENERAL';
export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';

export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function useMyFeedback() {
  return useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => apiClient.get<Feedback[]>('/feedback/my'),
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: FeedbackType; subject: string; message: string }) =>
      apiClient.post<Feedback>('/feedback', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast.success('Feedback submitted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to submit feedback', { description: error.message });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedbackId: string) => apiClient.delete(`/feedback/${feedbackId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast.success('Feedback deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete feedback', { description: error.message });
    },
  });
}

// Admin hooks
export function useAdminFeedback(status?: FeedbackStatus, type?: FeedbackType) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  const query = params.toString();

  return useQuery({
    queryKey: ['admin-feedback', status, type],
    queryFn: () => apiClient.get<Feedback[]>(`/feedback/admin${query ? `?${query}` : ''}`),
  });
}

export function useRespondToFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feedbackId, status, adminNote }: { feedbackId: string; status: FeedbackStatus; adminNote?: string }) =>
      apiClient.patch<Feedback>(`/feedback/admin/${feedbackId}/respond`, { status, adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Response sent');
    },
    onError: (error: any) => {
      const isForbidden =
        typeof error?.message === 'string' &&
        (error.message.toLowerCase().includes('forbidden') ||
          error.message.toLowerCase().includes('unauthorized'));
      toast.error('Failed to respond', {
        description: isForbidden
          ? 'This action is restricted to admins.'
          : error.message,
      });
    },
  });
}
