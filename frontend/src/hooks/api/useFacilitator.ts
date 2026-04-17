import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/api';
import { UserRole } from '@/types/api';
import { toast } from 'sonner';

// Types
export interface CohortStats {
  fellowCount: number;
  activeFellows: number;
  avgProgress: number;
  totalResources: number;
  completedResources: number;
  totalDiscussions: number;
  activeDiscussions: number;
  avgQuizScore: number;
  attendanceRate: number;
}

export interface FellowEngagement {
  userId: string;
  name: string;
  email: string;
  progress: number;
  /** % of resources completed that are due before the cohort's next scheduled session */
  sessionProgress: number | null;
  lastActive: Date;
  resourcesCompleted: number;
  totalPoints: number;
  currentStreak: number;
  discussionCount: number;
  quizAvg: number;
  needsAttention: boolean;
  attentionReason?: string;
}

export interface ResourceCompletion {
  resourceId: string;
  title: string;
  type: string;
  completionRate: number;
  avgTimeSpent: number;
  totalAttempts: number;
}

export interface FellowResourceMatrixResource {
  resourceId: string;
  title: string;
  type: string;
  isCore: boolean;
  sessionNumber: number;
  sessionTitle: string;
}

export interface FellowResourceMatrixFellow {
  userId: string;
  name: string;
  email: string;
}

export interface FellowResourceMatrixCell {
  userId: string;
  resourceId: string;
  state: string | null;
  needsAttention: boolean;
}

export interface FellowResourceMatrixResponse {
  resources: FellowResourceMatrixResource[];
  fellows: FellowResourceMatrixFellow[];
  cells: FellowResourceMatrixCell[];
}

// Get cohort statistics
export function useCohortStats(cohortId?: string) {
  return useQuery({
    queryKey: ['cohort-stats', cohortId],
    queryFn: () => apiClient.get<CohortStats>(`/facilitator/cohorts/${cohortId}/stats`),
    enabled: !!cohortId,
  });
}

// Get fellow engagement metrics
export function useFellowEngagement(cohortId?: string) {
  return useQuery({
    queryKey: ['fellow-engagement', cohortId],
    queryFn: () => apiClient.get<FellowEngagement[]>(`/facilitator/cohorts/${cohortId}/fellows`),
    enabled: !!cohortId,
  });
}

// Get resource completion rates
export function useResourceCompletions(cohortId?: string) {
  return useQuery({
    queryKey: ['resource-completions', cohortId],
    queryFn: () => apiClient.get<ResourceCompletion[]>(`/facilitator/cohorts/${cohortId}/resources`),
    enabled: !!cohortId,
  });
}

/** Per-fellow × resource progress (Cohort Pulse matrix). */
export function useFellowResourceMatrix(cohortId?: string) {
  return useQuery({
    queryKey: ['fellow-resource-matrix', cohortId],
    queryFn: () =>
      apiClient.get<FellowResourceMatrixResponse>(
        `/facilitator/cohorts/${cohortId}/fellow-resource-matrix`,
      ),
    enabled: !!cohortId,
  });
}

// Suspend a fellow (facilitator-scoped)
export function useFacilitatorSuspendFellow(cohortId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fellowId, reason }: { fellowId: string; reason?: string }) =>
      apiClient.patch(`/facilitator/cohorts/${cohortId}/fellows/${fellowId}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fellow-engagement', cohortId] });
      toast.success('Fellow suspended');
    },
    onError: (error: any) => {
      toast.error('Failed to suspend fellow', { description: error.message });
    },
  });
}

// Unsuspend a fellow (facilitator-scoped)
export function useFacilitatorUnsuspendFellow(cohortId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fellowId: string) =>
      apiClient.patch(`/facilitator/cohorts/${cohortId}/fellows/${fellowId}/unsuspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fellow-engagement', cohortId] });
      toast.success('Fellow unsuspended');
    },
    onError: (error: any) => {
      toast.error('Failed to unsuspend fellow', { description: error.message });
    },
  });
}

export function useSetCohortLeadership(cohortId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      captainUserId?: string | null;
      assistantUserId?: string | null;
    }) =>
      apiClient.patch(`/facilitator/cohorts/${cohortId}/cohort-leadership`, body),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['cohort-members', cohortId] });
      queryClient.invalidateQueries({ queryKey: ['fellow-engagement', cohortId] });
      queryClient.invalidateQueries({ queryKey: ['fellow-resource-matrix', cohortId] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      const { user, setUser } = useAuthStore.getState();
      if (
        user?.role === UserRole.FELLOW &&
        cohortId &&
        user.cohortId === cohortId
      ) {
        try {
          const userData = await apiClient.get<User>('/users/me');
          setUser(userData);
        } catch {
          // Sidebar still updates on next navigation or manual refresh
        }
      }
      toast.success('Cohort leadership updated');
    },
    onError: (error: any) => {
      toast.error('Could not update leadership', { description: error.message });
    },
  });
}
