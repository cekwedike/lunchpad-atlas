'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  getDashboardForRole,
  isProtectedRoutePath,
} from '@/lib/dashboard-routes';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import type { User, LoginRequest, RegisterRequest } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function postBffAuth(
  path: string,
  body: unknown
): Promise<{ user: User }> {
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
  return data as { user: User };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    isAuthenticated,
    setUser,
    logout: storeLogout,
    _hasHydrated,
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    const isProtectedRoute = isProtectedRoutePath(pathname);

    const checkAuth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 3000);
        await fetch('/api/proxy/health', {
          method: 'GET',
          signal: controller.signal,
          credentials: 'include',
        });
        window.clearTimeout(timeoutId);
      } catch {
        apiClient.clearTokens();
        storeLogout();
        if (isProtectedRoute) router.replace('/login');
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated && !user && !isProtectedRoute) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await apiClient.get<User>('/users/me');
        setUser(userData);
      } catch {
        apiClient.clearTokens();
        storeLogout();
        if (isProtectedRoute) {
          router.replace('/login?session=expired');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [
    _hasHydrated,
    pathname,
    isAuthenticated,
    user,
    router,
    setUser,
    storeLogout,
  ]);

  const login = async (credentials: LoginRequest) => {
    try {
      const data = await postBffAuth('/api/auth/login', credentials);
      setUser(data.user);
      toast.success('Welcome back!', `Logged in as ${data.user.name}`);
      window.location.assign(getDashboardForRole(data.user.role));
    } catch (error: unknown) {
      const msg =
        error instanceof ApiClientError ? error.message : 'Invalid credentials';
      toast.error('Login failed', msg);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const res = await postBffAuth('/api/auth/register', data);
      setUser(res.user);
      toast.success('Account created!', 'Welcome to ATLAS');
      window.location.assign(getDashboardForRole(res.user.role));
    } catch (error: unknown) {
      const msg =
        error instanceof ApiClientError
          ? error.message
          : 'Could not create account';
      toast.error('Registration failed', msg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } finally {
      apiClient.clearTokens();
      storeLogout();
      toast.info('Logged out', 'See you next time!');
      router.push('/');
    }
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      try {
        const userData = await apiClient.get<User>('/users/me');
        setUser(userData);
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
