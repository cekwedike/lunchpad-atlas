import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LeaderboardResponse, LeaderboardRankResponse } from '@/types/api';

export interface LeaderboardMonthOption {
  month: number;
  year: number;
  label: string;
}

export function useLeaderboard(cohortId?: string, month?: { month: number; year: number }) {
  return useQuery({
    queryKey: ['leaderboard', cohortId, month?.month, month?.year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (month) {
        params.append('month', String(month.month));
        params.append('year', String(month.year));
      }
      
      const endpoint = `/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<LeaderboardResponse>(endpoint);
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboardRank(cohortId?: string, month?: { month: number; year: number }) {
  return useQuery({
    queryKey: ['leaderboard-rank', cohortId, month?.month, month?.year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (month) {
        params.append('month', String(month.month));
        params.append('year', String(month.year));
      }
      const endpoint = `/leaderboard/rank${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<LeaderboardRankResponse>(endpoint);
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboardMonths(cohortId?: string) {
  return useQuery({
    queryKey: ['leaderboard-months', cohortId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      const endpoint = `/leaderboard/months${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get<{ months: LeaderboardMonthOption[] }>(endpoint);
    },
    enabled: !!cohortId,
  });
}
