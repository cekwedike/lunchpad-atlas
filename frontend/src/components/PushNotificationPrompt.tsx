'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { env } from '@/lib/env';

/**
 * Renders a dismissible banner prompting the user to enable push notifications.
 * Only shows when:
 *  - The browser supports push
 *  - VAPID public key is configured
 *  - Permission is not yet granted or denied
 *  - User has not already dismissed it this session
 */
export function PushNotificationPrompt() {
  const { state, isSubscribed, isLoading, isSupported, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // start hidden, show after mount check

  useEffect(() => {
    // Don't show if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('push-prompt-dismissed') === '1';
    if (!wasDismissed) setDismissed(false);
  }, []);

  // Only show when: supported, vapid key set, permission is default, not subscribed, not dismissed
  const shouldShow =
    isSupported &&
    !!env.vapidPublicKey &&
    state === 'default' &&
    !isSubscribed &&
    !dismissed;

  if (!shouldShow) return null;

  const handleEnable = async () => {
    const success = await subscribe();
    if (success || Notification.permission !== 'default') {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('push-prompt-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 shadow-xl sm:bottom-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl" aria-hidden="true">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">
            Stay in the loop
          </p>
          <p className="mt-0.5 text-xs text-slate-400 leading-snug">
            Enable push notifications to get instant alerts for new resources,
            quiz starts, and discussion replies — even when the app is in the background.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="mt-0.5 shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex gap-2 justify-end">
        <button
          onClick={handleDismiss}
          className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Enabling…' : 'Enable notifications'}
        </button>
      </div>
    </div>
  );
}
