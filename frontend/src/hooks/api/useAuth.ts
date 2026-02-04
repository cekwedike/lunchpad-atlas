import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import type { LoginRequest, RegisterRequest, LoginResponse, User } from '@/types/api';

export function useLogin() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      return apiClient.post<LoginResponse>('/auth/login', credentials, {
        requiresAuth: false,
      });
    },
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      apiClient.setToken(data.accessToken);
      
      // Update store
      setUser(data.user);
      
      // Invalidate queries
      queryClient.invalidateQueries();
      
      toast.success('Welcome back!', `Logged in as ${data.user.name}`);
    },
    onError: (error: any) => {
      toast.error('Login failed', error.message || 'Invalid credentials');
    },
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      return apiClient.post<LoginResponse>('/auth/register', data, {
        requiresAuth: false,
      });
    },
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      apiClient.setToken(data.accessToken);
      
      // Update store
      setUser(data.user);
      
      // Invalidate queries
      queryClient.invalidateQueries();
      
      toast.success('Account created!', 'Welcome to ATLAS');
    },
    onError: (error: any) => {
      toast.error('Registration failed', error.message || 'Could not create account');
    },
  });
}

export function useLogout() {
  const { logout: storeLogout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout', {}).catch(() => {
        // Ignore errors, just clear local data
      });
    },
    onSettled: () => {
      // Clear tokens and store
      apiClient.clearTokens();
      storeLogout();
      
      // Clear all queries
      queryClient.clear();
      
      toast.info('Logged out', 'See you next time!');
    },
  });
}

export function useUpdateProfile() {
  const { setUser, user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      return apiClient.patch<User>('/users/me', data);
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Profile updated', 'Your changes have been saved');
    },
    onError: (error: any) => {
      toast.error('Update failed', error.message || 'Could not update profile');
    },
  });
}
