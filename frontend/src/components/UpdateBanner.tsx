'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Shows a slim banner when the service worker is updated.
 * The SW calls skipWaiting() immediately on install, so when a new SW activates
 * and claims the page, `controllerchange` fires — that's our signal to prompt.
 * We ignore the first controllerchange if there was no prior controller (first load).
 */
export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Track whether there was already a controlling SW when the page loaded.
    // If not, the first controllerchange is just the SW claiming the page
    // for the first time — not an update.
    let hadController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!hadController) {
        // First time SW takes control — not an update, just record it.
        hadController = true;
        return;
      }
      // SW changed while page was running — a new version deployed.
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
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
