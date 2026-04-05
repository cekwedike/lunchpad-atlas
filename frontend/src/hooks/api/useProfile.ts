import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { useAuthSessionReady } from '@/hooks/useAuthSessionReady';
import { toast } from 'sonner';
import type { User, UserAchievement } from '@/types/api';

export function useProfile(userId?: string) {
  const { user: currentUser, isAuthenticated, _hasHydrated } = useAuthStore();
  const authSessionReady = useAuthSessionReady();
  const targetUserId = userId || currentUser?.id;
  const sessionReady = _hasHydrated && isAuthenticated && authSessionReady;

  return useQuery({
    queryKey: ['user', targetUserId || 'me'],
    queryFn: async () => {
      const endpoint = userId ? `/users/${userId}` : '/users/me';
      return apiClient.get<User>(endpoint);
    },
    enabled: userId ? !!userId : sessionReady,
    retry: false,
  });
}

export function useUserAchievements(userId?: string) {
  const { user: currentUser, isAuthenticated, _hasHydrated } = useAuthStore();
  const authSessionReady = useAuthSessionReady();
  const targetUserId = userId || currentUser?.id;
  const sessionReady = _hasHydrated && isAuthenticated && authSessionReady;

  return useQuery({
    queryKey: ['user-achievements', targetUserId],
    queryFn: async () => {
      const endpoint = userId 
        ? `/users/${userId}/achievements`
        : '/users/me/achievements';
      return apiClient.get<UserAchievement[]>(endpoint);
    },
    enabled: userId ? !!userId : sessionReady,
    retry: false,
  });
}

/** All achievement definitions (for the gallery page) */
export function useAllAchievements() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const authSessionReady = useAuthSessionReady();
  const sessionReady = _hasHydrated && isAuthenticated && authSessionReady;
  return useQuery({
    queryKey: ['achievements', 'all'],
    queryFn: () => apiClient.get<any[]>('/achievements'),
    enabled: sessionReady,
    staleTime: 5 * 60 * 1000, // achievements rarely change
  });
}

export interface UserStats {
  resourcesCompleted?: number;
  totalPoints?: number;
  quizzesTaken?: number;
  discussionsPosted?: number;
  currentStreak?: number;
}

export function useUserStats(userId?: string) {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const authSessionReady = useAuthSessionReady();
  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: ['user-stats', targetUserId],
    queryFn: async () => {
      const endpoint = userId ? `/users/${userId}/stats` : '/users/me/stats';
      return apiClient.get<UserStats>(endpoint);
    },
    enabled: userId
      ? !!userId
      : isAuthenticated && !!currentUser && authSessionReady,
    retry: false,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/users/me/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to change password', {
        description: error.message || 'Current password may be incorrect',
      });
    },
  });
}

export function useUpdateEmailPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { emailNotifications?: boolean; weeklyDigest?: boolean }) =>
      apiClient.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    },
  });
}
