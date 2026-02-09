import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LeaderboardResponse, LeaderboardRankResponse } from '@/types/api';

export function useLeaderboard(cohortId?: string, month?: Date) {
  return useQuery({
    queryKey: ['leaderboard', cohortId, month?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (month) params.append('month', String(month.getMonth() + 1));
      
      const endpoint = `/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<LeaderboardResponse>(endpoint);
    },
  });
}

export function useLeaderboardRank(cohortId?: string, month?: Date) {
  return useQuery({
    queryKey: ['leaderboard-rank', cohortId, month?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (month) params.append('month', String(month.getMonth() + 1));
      const endpoint = `/leaderboard/rank${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<LeaderboardRankResponse>(endpoint);
    },
  });
}
