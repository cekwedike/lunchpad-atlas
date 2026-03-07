'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

type PushState = 'unsupported' | 'denied' | 'granted' | 'default';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  useEffect(() => {
    if (!isSupported) {
      setState('unsupported');
      return;
    }

    const permission = Notification.permission as PushState;
    setState(permission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setSubscribeError(null);
    if (!isSupported) {
      const err = 'Push notifications are not supported in this browser.';
      setSubscribeError(err);
      return { ok: false, error: err };
    }

    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== 'granted') {
        const err = 'Notification permission was not granted. Allow notifications for this site in browser settings.';
        setSubscribeError(err);
        return { ok: false, error: err };
      }

      // Fetch the VAPID public key from the server — guarantees the key matches the backend
      let vapidKey: string;
      try {
        const res = await apiClient.get<{ publicKey: string }>('/push/vapid-public-key');
        vapidKey = (res.data.publicKey ?? '').trim();
        if (!vapidKey) throw new Error('Server returned an empty VAPID key.');
      } catch (e: any) {
        const err = `Could not fetch push configuration from server: ${e?.message ?? String(e)}`;
        setSubscribeError(err);
        return { ok: false, error: err };
      }

      // If a stale subscription exists (e.g. from a previous VAPID key), clear it first
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        try { await existingSub.unsubscribe(); } catch { /* ignore */ }
      }

      // Subscribe to push using the server-provided key
      let subscription: PushSubscription;
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error('pushManager.subscribe failed:', msg);
        const isPushServiceError =
          msg.includes('push service error') ||
          msg.includes('Registration failed') ||
          msg.includes('AbortError');
        const hint = isPushServiceError
          ? ' This is often caused by a VPN, firewall, ad-blocker, or browser extension blocking the push service. Try disabling extensions or switching networks.'
          : '';
        const err = `Browser push subscription failed: ${msg}${hint}`;
        setSubscribeError(err);
        return { ok: false, error: err };
      }

      const json = subscription.toJSON();
      try {
        await apiClient.post('/push/subscribe', {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        });
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error('Push subscribe API failed:', msg);
        const err = `Failed to register with server: ${msg}`;
        setSubscribeError(err);
        return { ok: false, error: err };
      }

      setIsSubscribed(true);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('Push subscription failed:', msg);
      setSubscribeError(msg);
      return { ok: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // No active subscription — correct local state and exit cleanly
        setIsSubscribed(false);
        return true;
      }

      // Notify server — ignore errors (subscription may not exist server-side)
      try {
        await apiClient.delete(
          `/push/unsubscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
        );
      } catch (apiErr) {
        console.warn('Push unsubscribe server call failed (continuing):', apiErr);
      }
      // Always unsubscribe from the browser regardless of server response
      await sub.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { state, isSubscribed, isLoading, isSupported, subscribeError, subscribe, unsubscribe } as const;
}
