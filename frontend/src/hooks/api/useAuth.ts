import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import type { LoginRequest, RegisterRequest, LoginResponse, User } from '@/types/api';

async function postBffAuth(
  path: string,
  body: unknown
): Promise<LoginResponse> {
  const r = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new ApiClientError(
      r.status,
      (data as { message?: string }).message || 'Request failed'
    );
  }
  return data as LoginResponse;
}

export function useLogin() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      return postBffAuth('/api/auth/login', credentials);
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      toast.success('Welcome back!', `Logged in as ${data.user.name}`);
    },
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      return postBffAuth('/api/auth/register', data);
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      toast.success('Account created!', 'Welcome to ATLAS');
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ApiClientError
          ? error.message
          : 'Could not create account';
      toast.error('Registration failed', msg);
    },
  });
}

export function useLogout() {
  const { logout: storeLogout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    },
    onSettled: () => {
      apiClient.clearTokens();
      storeLogout();
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
      const prev = useAuthStore.getState().user;
      setUser(prev && data ? { ...prev, ...data } : data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated', 'Your changes have been saved');
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ApiClientError ? error.message : 'Could not update profile';
      toast.error('Update failed', msg);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      return apiClient.post('/users/me/change-password', data);
    },
    onSuccess: () => {
      toast.success('Password changed', 'Your password has been updated');
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ApiClientError
          ? error.message
          : 'Incorrect current password';
      toast.error('Password change failed', msg);
    },
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      return apiClient.get<{ needsSetup: boolean }>('/auth/setup', {
        requiresAuth: false,
      });
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useSetupAdmin() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => {
      return postBffAuth('/api/auth/setup', data);
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast.success(
        'Setup complete!',
        'Admin account created. Welcome to ATLAS!'
      );
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ApiClientError
          ? error.message
          : 'Could not create admin account';
      toast.error('Setup failed', msg);
    },
  });
}
