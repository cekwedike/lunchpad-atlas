import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  setUser: (user: User | null) => void;
  setGuestMode: (isGuest: boolean) => void;
  logout: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuestMode: false,
      _hasHydrated: false,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isGuestMode: false }),
      setGuestMode: (isGuest) =>
        set({ isGuestMode: isGuest, isAuthenticated: false, user: null }),
      logout: () =>
        set({ user: null, isAuthenticated: false, isGuestMode: false }),
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state
        });
      }
    }),
    {
      name: 'auth-storage',
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
