'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker. Update UX is handled by UpdateBanner in Providers
 * (listens for SW_UPDATED / controllerchange).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIF_NAVIGATE' && typeof event.data.href === 'string') {
        window.location.assign(event.data.href);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        void reg.update();
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });

    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  return null;
}
