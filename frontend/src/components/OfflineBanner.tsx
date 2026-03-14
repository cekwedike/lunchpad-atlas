'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Shows a slim banner at the top of the page when the browser loses network.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Initialise from current state
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-16 sm:top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-slate-900 border-b border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0 text-blue-400" />
      <span className="text-center leading-snug">You are offline. Showing cached data — changes will sync when reconnected.</span>
    </div>
  );
}
