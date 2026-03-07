'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';

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
    if (!isSupported || !env.vapidPublicKey) {
      const err = 'Push notifications are not configured for this app.';
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

      // Subscribe to push
      let subscription: PushSubscription;
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
        });
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error('pushManager.subscribe failed:', msg);
        const err = `Browser push subscription failed: ${msg}`;
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

      await apiClient.delete(
        `/push/unsubscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
      );
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
