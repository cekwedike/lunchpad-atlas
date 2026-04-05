'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePushVapidConfigured } from '@/hooks/usePushVapidConfigured';
import { useAuthStore } from '@/stores/authStore';
import { safeGetItem, safeSetItem } from '@/lib/safe-local-storage';
import {
  IOS_ADD_TO_HOME_SHORT,
  isLikelyIOS,
  isStandalonePwa,
} from '@/lib/pwa-platform';

function pushPromptDismissKey(userId: string) {
  return `atlas_push_prompt_dismissed_${userId}`;
}

function iosHomeHintDismissKey(userId: string) {
  return `atlas_ios_home_hint_dismissed_${userId}`;
}

const cardClass =
  'fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 shadow-xl sm:bottom-6';

/**
 * Dismissible banners for push and/or iOS “Add to Home Screen”.
 * Push: when supported, VAPID ready, permission default, not subscribed.
 * iOS-only: when on iPhone/iPad in Safari (not standalone) and push card is not shown.
 */
export function PushNotificationPrompt() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const { state, isSubscribed, isLoading, isSupported, subscribe } = usePushNotifications();
  const { vapidAvailable, vapidLoading } = usePushVapidConfigured(isSupported);
  const [dismissed, setDismissed] = useState(true);
  const [iosHintDismissed, setIosHintDismissed] = useState(true);

  const iosInBrowserTab = isLikelyIOS() && !isStandalonePwa();

  useEffect(() => {
    if (!userId) {
      setDismissed(true);
      setIosHintDismissed(true);
      return;
    }
    setDismissed(safeGetItem(pushPromptDismissKey(userId)) === '1');
    setIosHintDismissed(safeGetItem(iosHomeHintDismissKey(userId)) === '1');
  }, [userId]);

  const shouldShowPush =
    !!userId &&
    isSupported &&
    !vapidLoading &&
    vapidAvailable &&
    state === 'default' &&
    !isSubscribed &&
    !dismissed;

  const shouldShowIosOnly =
    !!userId &&
    iosInBrowserTab &&
    !shouldShowPush &&
    !iosHintDismissed;

  const handleEnable = async () => {
    const { ok } = await subscribe();
    if (ok || Notification.permission !== 'default') {
      setDismissed(true);
    }
  };

  const handleDismissPush = () => {
    if (userId) safeSetItem(pushPromptDismissKey(userId), '1');
    setDismissed(true);
  };

  const handleDismissIos = () => {
    if (userId) safeSetItem(iosHomeHintDismissKey(userId), '1');
    setIosHintDismissed(true);
  };

  if (shouldShowPush) {
    return (
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden="true">
            🔔
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-white">Stay in the loop</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              Enable push notifications to get instant alerts for new resources, quiz starts, and
              discussion replies — even when the app is in the background.
            </p>
            {iosInBrowserTab && (
              <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-snug text-amber-100">
                <span className="font-medium text-amber-50">iPhone / iPad:</span> {IOS_ADD_TO_HOME_SHORT}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismissPush}
            className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-slate-300"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismissPush}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Enabling…' : 'Enable notifications'}
          </button>
        </div>
      </div>
    );
  }

  if (shouldShowIosOnly) {
    return (
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden="true">
            📱
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-white">Better on your Home Screen</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              {IOS_ADD_TO_HOME_SHORT} You get a full-screen app icon like other apps. On iOS 16.4 or
              later, you can enable push notifications from Profile after adding ATLAS.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissIos}
            className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-slate-300"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleDismissIos}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}
