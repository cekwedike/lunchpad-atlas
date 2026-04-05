import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** False until AuthContext finishes session check (not persisted). */
  sessionBootstrapComplete: boolean;
  setUser: (user: User | null) => void;
  setSessionBootstrapComplete: (v: boolean) => void;
  logout: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sessionBootstrapComplete: false,
      _hasHydrated: false,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),
      setSessionBootstrapComplete: (v) => set({ sessionBootstrapComplete: v }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionBootstrapComplete: true,
        }),
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state
        });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
