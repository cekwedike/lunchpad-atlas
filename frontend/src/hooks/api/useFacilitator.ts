import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
