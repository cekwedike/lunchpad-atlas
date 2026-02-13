import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Store token in cookies for middleware with proper settings
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7 days
      document.cookie = `accessToken=${data.accessToken}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      
      apiClient.setToken(data.accessToken);
      
      // Update store - This triggers the query hooks to fetch data
      setUser(data.user);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries();
      
      toast.success('Welcome back!', `Logged in as ${data.user.name}`);
    },
    onError: (error: any) => {
      console.error('Login error:', error);
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
      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Store token in cookies for middleware
      document.cookie = `accessToken=${data.accessToken}; path=/; max-age=604800`; // 7 days
      
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
      // Clear tokens from localStorage and store
      apiClient.clearTokens();
      storeLogout();
      
      // Clear cookies
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
      
      // Clear all queries
      queryClient.clear();
      
      toast.info('Logged out', 'See you next time!');
    },
  });
}

export function useUpdateProfile() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      return apiClient.put<User>('/users/me', data);
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated', 'Your changes have been saved');
    },
    onError: (error: any) => {
      toast.error('Update failed', error.message || 'Could not update profile');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiClient.post('/users/me/change-password', data);
    },
    onSuccess: () => {
      toast.success('Password changed', 'Your password has been updated');
    },
    onError: (error: any) => {
      toast.error('Password change failed', error.message || 'Incorrect current password');
    },
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      return apiClient.get<{ needsSetup: boolean }>('/auth/setup', { requiresAuth: false } as any);
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useSetupAdmin() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      return apiClient.post<LoginResponse>('/auth/setup', data, { requiresAuth: false });
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      document.cookie = `accessToken=${data.accessToken}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      apiClient.setToken(data.accessToken);
      setUser(data.user);
      toast.success('Setup complete!', 'Admin account created. Welcome to ATLAS!');
    },
    onError: (error: any) => {
      toast.error('Setup failed', error.message || 'Could not create admin account');
    },
  });
}
