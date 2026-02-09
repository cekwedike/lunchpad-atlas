'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import type { User, LoginRequest, RegisterRequest, LoginResponse } from '@/types/api';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          const userData = await apiClient.get<User>('/users/me');
          setUser(userData);
        } catch (error) {
          // Token invalid, clear it
          apiClient.clearTokens();
          storeLogout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [user, setUser, storeLogout]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        requiresAuth: false,
      });

      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      // Store token in cookies for middleware
      document.cookie = `accessToken=${response.accessToken}; path=/; max-age=604800`; // 7 days
      
      apiClient.setToken(response.accessToken);

      // Update store
      setUser(response.user);

      toast.success('Welcome back!', `Logged in as ${response.user.name}`);
      router.push(`/dashboard/${response.user.role.toLowerCase()}`);
    } catch (error: any) {
      toast.error('Login failed', error.message || 'Invalid credentials');
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', data, {
        requiresAuth: false,
      });

      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      // Store token in cookies for middleware
      document.cookie = `accessToken=${response.accessToken}; path=/; max-age=604800`; // 7 days
      
      apiClient.setToken(response.accessToken);

      // Update store
      setUser(response.user);

      toast.success('Account created!', 'Welcome to ATLAS');
      router.push(`/dashboard/${response.user.role.toLowerCase()}`);
    } catch (error: any) {
      toast.error('Registration failed', error.message || 'Could not create account');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if it exists
      await apiClient.post('/auth/logout', {}).catch(() => {
        // Ignore errors, just clear local data
      });
    } finally {
      // Clear tokens and store
      apiClient.clearTokens();
      storeLogout();
      
      // Clear cookies
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
      
      toast.info('Logged out', 'See you next time!');
      router.push('/login');
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
