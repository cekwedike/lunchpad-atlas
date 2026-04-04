'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePushVapidConfigured } from '@/hooks/usePushVapidConfigured';
import { useAuthStore } from '@/stores/authStore';
import { safeGetItem, safeSetItem } from '@/lib/safe-local-storage';

function pushPromptDismissKey(userId: string) {
  return `atlas_push_prompt_dismissed_${userId}`;
}

/**
 * Renders a dismissible banner prompting the user to enable push notifications.
 * Only shows when:
 *  - The browser supports push
 *  - API reports a VAPID public key (same source as subscribe)
 *  - Permission is not yet granted or denied
 *  - User has not dismissed the prompt for this account (stored per user id)
 */
export function PushNotificationPrompt() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const { state, isSubscribed, isLoading, isSupported, subscribe } = usePushNotifications();
  const { vapidAvailable, vapidLoading } = usePushVapidConfigured(isSupported);
  const [dismissed, setDismissed] = useState(true); // start hidden, show after mount check

  useEffect(() => {
    if (!userId) {
      setDismissed(true);
      return;
    }
    const wasDismissed = safeGetItem(pushPromptDismissKey(userId)) === '1';
    setDismissed(wasDismissed);
  }, [userId]);

  // Only show when: supported, server VAPID ready, permission is default, not subscribed, not dismissed
  const shouldShow =
    !!userId &&
    isSupported &&
    !vapidLoading &&
    vapidAvailable &&
    state === 'default' &&
    !isSubscribed &&
    !dismissed;

  if (!shouldShow) return null;

  const handleEnable = async () => {
    const { ok } = await subscribe();
    if (ok || Notification.permission !== 'default') {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    if (userId) safeSetItem(pushPromptDismissKey(userId), '1');
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
