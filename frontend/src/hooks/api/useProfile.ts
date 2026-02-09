import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserAchievement } from '@/types/api';

export function useProfile(userId?: string) {
  const { user: currentUser } = useAuthStore();
  const targetUserId = userId || currentUser?.id;
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  return useQuery({
    queryKey: ['user', targetUserId || 'me'],
    queryFn: async () => {
      const endpoint = userId ? `/users/${userId}` : '/users/me';
      return apiClient.get<User>(endpoint);
    },
    enabled: userId ? !!userId : hasToken,
    retry: false,
  });
}

export function useUserAchievements(userId?: string) {
  const { user: currentUser } = useAuthStore();
  const targetUserId = userId || currentUser?.id;
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  return useQuery({
    queryKey: ['user-achievements', targetUserId],
    queryFn: async () => {
      const endpoint = userId 
        ? `/users/${userId}/achievements`
        : '/users/me/achievements';
      return apiClient.get<UserAchievement[]>(endpoint);
    },
    enabled: userId ? !!userId : hasToken,
    retry: false,
  });
}

export function useUserStats(userId?: string) {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: ['user-stats', targetUserId],
    queryFn: async () => {
      const endpoint = userId ? `/users/${userId}/stats` : '/users/me/stats';
      return apiClient.get(endpoint);
    },
    enabled: userId ? !!userId : (isAuthenticated && !!currentUser),
    retry: false,
  });
}
