import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  SessionAnalytics,
  CohortAnalytics,
  CohortInsights,
} from '@/types/sessionAnalytics';

// Fetch session analytics
export function useSessionAnalytics(sessionId: string) {
  return useQuery<SessionAnalytics>({
    queryKey: ['sessionAnalytics', sessionId],
    queryFn: () => apiClient.get<SessionAnalytics>(`/session-analytics/session/${sessionId}`),
    enabled: !!sessionId,
  });
}

// Fetch cohort analytics
export function useCohortAnalytics(cohortId: string) {
  return useQuery<CohortAnalytics>({
    queryKey: ['cohortAnalytics', cohortId],
    queryFn: () => apiClient.get<CohortAnalytics>(`/session-analytics/cohort/${cohortId}`),
    enabled: !!cohortId,
  });
}

// Fetch cohort insights (AI-generated)
export function useCohortInsights(cohortId: string) {
  return useQuery<CohortInsights>({
    queryKey: ['cohortInsights', cohortId],
    queryFn: () => apiClient.get<CohortInsights>(`/session-analytics/cohort/${cohortId}/insights`),
    enabled: !!cohortId,
  });
}

export function useAnalyticsSummary(cohortId: string) {
  return useQuery<any>({
    queryKey: ['analytics-summary', cohortId],
    queryFn: () => apiClient.get(`/session-analytics/summary/${cohortId}`),
    enabled: !!cohortId,
  });
}

// Process session transcript with AI
export function useProcessSessionTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      transcript,
    }: {
      sessionId: string;
      transcript: string;
    }) => {
      return apiClient.post(`/session-analytics/process/${sessionId}`, { transcript });
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['sessionAnalytics', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['cohortAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['cohortInsights'] });
    },
  });
}
