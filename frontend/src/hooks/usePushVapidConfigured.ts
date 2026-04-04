'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * Whether the API exposes a non-empty VAPID public key (push works without NEXT_PUBLIC_VAPID_PUBLIC_KEY).
 * `vapidAvailable` is true only after a successful fetch confirms a key; `vapidLoading` is true until then.
 */
export function usePushVapidConfigured(enabled = true) {
  const [result, setResult] = useState<boolean | null>(() => (enabled ? null : false));

  useEffect(() => {
    if (!enabled) {
      setResult(false);
      return;
    }

    setResult(null);
    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.get<{ publicKey: string }>('/push/vapid-public-key');
        const ok = !!(res.publicKey ?? '').trim();
        if (!cancelled) setResult(ok);
      } catch {
        if (!cancelled) setResult(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const vapidLoading = result === null;
  const vapidAvailable = result === true;
  const vapidChecked = result !== null;

  return { vapidAvailable, vapidLoading, vapidChecked };
}
