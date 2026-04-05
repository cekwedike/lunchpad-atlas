import { useAuthStore } from '@/stores/authStore';

/**
 * After rehydration, if the store says we're logged in, wait until AuthContext has
 * finished bootstrap (proactive refresh + /users/me). Avoids parallel API 401s that
 * can clear the session before cookies are renewed on a hard reload.
 */
export function useAuthSessionReady(): boolean {
  const { _hasHydrated, isAuthenticated, sessionBootstrapComplete } = useAuthStore();
  if (!_hasHydrated) return false;
  if (!isAuthenticated) return true;
  return sessionBootstrapComplete;
}
