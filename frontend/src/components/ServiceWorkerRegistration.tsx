'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Registers the PWA service worker and notifies users when an update is ready.
 * Must be a Client Component rendered inside the root layout.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for SW_UPDATED messages sent by the new SW after it activates
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_UPDATED') return;
      toast('Update available', {
        description: 'Reload to get the latest version of ATLAS.',
        duration: Infinity,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
