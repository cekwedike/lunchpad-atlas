import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MonthlyLeaderboard, LeaderboardEntry } from '@/types/api';

export function useLeaderboard(cohortId?: string, month?: Date) {
  return useQuery({
    queryKey: ['leaderboard', cohortId, month?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (month) params.append('month', month.toISOString());
      
      const endpoint = `/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<MonthlyLeaderboard>(endpoint);
    },
  });
}

export function useLeaderboardRank(userId: string) {
  return useQuery({
    queryKey: ['leaderboard-rank', userId],
    queryFn: () => apiClient.get<LeaderboardEntry>(`/leaderboard/rank/${userId}`),
    enabled: !!userId,
  });
}
