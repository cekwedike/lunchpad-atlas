'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  getDashboardForRole,
  isProtectedRoutePath,
} from '@/lib/dashboard-routes';
import { fetchBffRefresh } from '@/lib/bff-refresh';
import { getBffSessionSnapshot } from '@/lib/bff-session';
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
    setSessionBootstrapComplete,
    _hasHydrated,
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    const isProtectedRoute = isProtectedRoutePath(pathname);

    const checkAuth = async () => {
      setSessionBootstrapComplete(false);
      try {
        if (
          pathname.startsWith('/login') &&
          new URLSearchParams(window.location.search).get('session') === 'expired'
        ) {
          apiClient.clearTokens();
          storeLogout();
          return;
        }

        // Do not gate auth on a short health probe: Render cold starts often exceed a few
        // seconds and used to trigger abort → clearTokens → full logout on every reload.

        const sessionSnap = await getBffSessionSnapshot();
        if (!sessionSnap.hasRefreshCookie && !sessionSnap.hasAccessCookie) {
          if (isAuthenticated || user) {
            apiClient.clearTokens();
            storeLogout();
          }
          if (isProtectedRoute) {
            router.replace('/login?session=expired');
          }
          return;
        }

        if (!isAuthenticated && !user && !isProtectedRoute) {
          return;
        }

        // Renew access cookie before /users/me (short JWT_EXPIRATION vs long refresh).
        if (isProtectedRoute || (isAuthenticated && user)) {
          const r1 = await fetchBffRefresh();
          if (!r1.ok) {
            await new Promise((r) => setTimeout(r, 400));
            await fetchBffRefresh();
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        try {
          const userData = await apiClient.get<User>('/users/me');
          setUser(userData);
        } catch (err) {
          const isUnauthorized =
            err instanceof ApiClientError && err.statusCode === 401;
          if (isUnauthorized) {
            apiClient.clearTokens();
            storeLogout();
            if (isProtectedRoute) {
              router.replace('/login?session=expired');
            }
          }
          // Network / 502 / 429: keep cookies + persisted state; user can retry or refresh.
        }
      } finally {
        setSessionBootstrapComplete(true);
        setIsLoading(false);
      }
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
    setSessionBootstrapComplete,
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
