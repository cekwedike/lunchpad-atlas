import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

const INTERVAL_MS = 45_000;

/**
 * Accumulates time on the dashboard while the tab is visible (server caps each request).
 */
export function usePlatformTimePing(enabled: boolean) {
  const userId = useAuthStore((s) => s.user?.id);
  const lastPingRef = useRef(0);

  useEffect(() => {
    if (!enabled || !userId) return;
    lastPingRef.current = Date.now();

    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const seconds = Math.min(
        120,
        Math.max(15, Math.round((now - lastPingRef.current) / 1000)),
      );
      lastPingRef.current = now;
      void apiClient
        .post('/users/me/platform-time', { seconds })
        .catch(() => undefined);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled, userId]);
}
