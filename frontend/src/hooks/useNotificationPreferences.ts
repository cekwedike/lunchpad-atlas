'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safe-local-storage';

const SW_CACHE = 'atlas-prefs-v1';
const SW_CACHE_KEY = 'notification-prefs';

/** Persist prefs to Cache API so the service worker can read them for push. */
async function flushToCache(sound: boolean, vibration: boolean) {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(SW_CACHE);
    await cache.put(SW_CACHE_KEY, new Response(JSON.stringify({ sound, vibration })));
  } catch {
    // Cache API unavailable in this context
  }
}

export function useNotificationPreferences() {
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const s = safeGetItem('notif-sound') !== 'false';
    const v = safeGetItem('notif-vibration') !== 'false';
    setSound(s);
    setVibration(v);
    flushToCache(s, v);
  }, []);

  const updateSound = useCallback((value: boolean) => {
    setSound(value);
    safeSetItem('notif-sound', String(value));
    const v = safeGetItem('notif-vibration') !== 'false';
    flushToCache(value, v);
  }, []);

  const updateVibration = useCallback((value: boolean) => {
    setVibration(value);
    safeSetItem('notif-vibration', String(value));
    const s = safeGetItem('notif-sound') !== 'false';
    flushToCache(s, value);
  }, []);

  return { sound, vibration, updateSound, updateVibration };
}
