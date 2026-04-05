/**
 * ATLAS PWA Service Worker
 *
 * Strategies:
 *  - /_next/static/*  → Cache First  (hashed filenames, safe forever)
 *  - /icons/*, /favicon.ico, /manifest.webmanifest → Cache First
 *  - /api/*           → Network Only (real-time data must be fresh)
 *  - navigation       → not intercepted (Next.js proxy + auth redirects break SW fetch;
 *                        avoids "FetchEvent ... error response" and login/session bugs)
 *  - everything else  → Network First → cache fallback
 */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `atlas-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline';

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_PAGE))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete stale ATLAS caches from previous versions
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('atlas-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      ),
      // Take control of all open clients immediately
      self.clients.claim().then(() => {
        // Notify all open tabs that the SW has updated so they can prompt a reload
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
        });
      }),
    ]),
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept same-origin GET requests
  if (request.method !== 'GET') return;

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }

  if (requestUrl.origin !== self.location.origin) return;

  const path = requestUrl.pathname;

  // 1. Next.js static assets — Cache First (content-hashed, safe to cache forever)
  if (path.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 2. Next.js image optimization — Network Only (dynamic, skip caching)
  if (path.startsWith('/_next/image')) {
    return;
  }

  // 3. Public static files — Cache First
  if (
    path.startsWith('/icons/') ||
    path === '/favicon.ico' ||
    path === '/manifest.webmanifest'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. API requests — Network Only (real-time data, WebSocket handshakes, etc.)
  if (path.startsWith('/api/')) {
    return;
  }

  // 5. Navigation — never intercept. Service-worker fetch() for document navigations
  //    often resolves to responses Chrome treats as "error" with Next middleware,
  //    redirects, and cookies — breaking login and showing console warnings.
  if (request.mode === 'navigate') {
    return;
  }

  // 6. Everything else — Network First with cache fallback
  event.respondWith(networkFirst(request));
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns cached response if available; otherwise fetches, caches, and returns. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

/** Tries network first; falls back to cached version if network fails. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? Response.error();
  }
}

// ─── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'ATLAS', body: 'You have a new notification.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    (async () => {
      // Read user notification preferences written by the page
      let silent = false;
      let vibrate = [100, 50, 100];
      try {
        const cache = await caches.open('atlas-prefs-v1');
        const resp = await cache.match('notification-prefs');
        if (resp) {
          const prefs = await resp.json();
          silent = prefs.sound === false;
          vibrate = prefs.vibration === false ? [] : [100, 50, 100];
        }
      } catch {
        // Prefs unavailable — use defaults
      }

      const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: data.data ?? {},
        vibrate,
        silent,
        requireInteraction: false,
      };

      await self.registration.showNotification(data.title, options);

      // Update app icon badge when a push arrives (API may be absent in some SW runtimes)
      if (
        typeof self.navigator !== 'undefined' &&
        'setAppBadge' in self.navigator &&
        typeof self.navigator.setAppBadge === 'function'
      ) {
        self.navigator.setAppBadge().catch(() => {});
      }
    })(),
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (
    typeof self.navigator !== 'undefined' &&
    'clearAppBadge' in self.navigator &&
    typeof self.navigator.clearAppBadge === 'function'
  ) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const notifData = event.notification.data ?? {};
  let path = '/dashboard';

  if (notifData.channelId) path = `/dashboard/chat?channelId=${notifData.channelId}`;
  else if (notifData.discussionId) path = `/dashboard/discussions/${notifData.discussionId}`;
  else if (notifData.resourceId) path = `/resources/${notifData.resourceId}`;
  else if (notifData.liveQuizId) path = `/dashboard/live-quiz/${notifData.liveQuizId}`;
  else if (notifData.quizId) path = `/quiz/${notifData.quizId}`;

  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const openOrNavigate = (client) => {
        if (new URL(client.url).origin !== self.location.origin || !('focus' in client)) {
          return null;
        }
        const afterFocus = () => {
          if (
            'navigate' in client &&
            typeof client.navigate === 'function'
          ) {
            try {
              const result = client.navigate(targetUrl);
              if (result !== undefined && typeof result.then === 'function') {
                return result.catch(() => self.clients.openWindow(targetUrl));
              }
              return result ?? self.clients.openWindow(targetUrl);
            } catch {
              return self.clients.openWindow(targetUrl);
            }
          }
          return self.clients.openWindow(targetUrl);
        };
        const focused = client.focus();
        return focused !== undefined && typeof focused.then === 'function'
          ? focused.then(afterFocus)
          : Promise.resolve().then(afterFocus);
      };

      for (const client of clientList) {
        const p = openOrNavigate(client);
        if (p) return p;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
