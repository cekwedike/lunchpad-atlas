'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker. Update UX is handled by UpdateBanner in Providers
 * (listens for SW_UPDATED / controllerchange).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        void reg.update();
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}
