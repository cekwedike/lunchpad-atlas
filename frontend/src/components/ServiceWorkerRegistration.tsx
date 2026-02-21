'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker.
 * Must be a Client Component rendered inside the root layout.
 * Does nothing when service workers are unavailable (SSR, older browsers).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Listen for updates so users get new SW versions automatically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new SW is ready — the page will use it on the next reload.
              // We intentionally avoid force-reloading here to not disrupt the user.
              console.info('[SW] New version available. Reload to update.');
            }
          });
        });
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}
