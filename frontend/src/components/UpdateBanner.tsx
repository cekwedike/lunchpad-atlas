'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Shows a banner when the service worker is updated so users can reload
 * and get the latest version without a manual refresh.
 *
 * Two detection mechanisms:
 * 1. SW posts 'SW_UPDATED' message on activate (primary — fires for all open tabs)
 * 2. `controllerchange` event (fallback — fires when SW takes control of the page)
 *    Ignored on first load when there was no previous controller.
 */
export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // ── Primary: message from the SW ────────────────────────────────────────
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        setUpdateAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // ── Fallback: controllerchange ──────────────────────────────────────────
    // Ignore the first controllerchange if the page loaded with no controller
    // (that's just the SW claiming the page for the first time).
    let hadController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      setUpdateAvailable(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] flex items-center justify-between gap-3 bg-blue-950 px-4 py-3 text-sm text-white shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:inset-x-auto sm:rounded-xl sm:max-w-sm">
      <div className="min-w-0">
        <p className="font-semibold leading-snug">Update available</p>
        <p className="text-xs text-blue-300 mt-0.5">Reload to get the latest version of ATLAS.</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 hover:bg-blue-50 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Reload
      </button>
    </div>
  );
}
