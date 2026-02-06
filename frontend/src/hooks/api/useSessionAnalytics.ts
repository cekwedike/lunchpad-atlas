import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SessionAnalytics,
  CohortAnalytics,
  CohortInsights,
} from '@/types/sessionAnalytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Fetch session analytics
export function useSessionAnalytics(sessionId: string) {
  return useQuery<SessionAnalytics>({
    queryKey: ['sessionAnalytics', sessionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/session-analytics/session/${sessionId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch session analytics');
      return response.json();
    },
    enabled: !!sessionId,
  });
}

// Fetch cohort analytics
export function useCohortAnalytics(cohortId: string) {
  return useQuery<CohortAnalytics>({
    queryKey: ['cohortAnalytics', cohortId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/session-analytics/cohort/${cohortId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch cohort analytics');
      return response.json();
    },
    enabled: !!cohortId,
  });
}

// Fetch cohort insights (AI-generated)
export function useCohortInsights(cohortId: string) {
  return useQuery<CohortInsights>({
    queryKey: ['cohortInsights', cohortId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/session-analytics/cohort/${cohortId}/insights`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch cohort insights');
      return response.json();
    },
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
      const response = await fetch(
        `${API_URL}/session-analytics/process/${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ transcript }),
        }
      );
      if (!response.ok) throw new Error('Failed to process session transcript');
      return response.json();
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['sessionAnalytics', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['cohortAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['cohortInsights'] });
    },
  });
}
