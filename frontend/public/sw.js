/**
 * ATLAS PWA Service Worker
 *
 * Strategies:
 *  - /_next/static/*  → Cache First  (hashed filenames, safe forever)
 *  - /icons/*, /favicon.ico, /manifest.webmanifest → Cache First
 *  - /api/*           → Network Only (real-time data must be fresh)
 *  - All app HTML/RSC → not intercepted. Next uses GET + mode !== "navigate" for flights;
 *    our old "networkFirst" fallback returned Response.error() and broke /login + refresh auth.
 */

const CACHE_VERSION = 'v7';
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

  // 5. Do not intercept any other requests. Next.js uses non-navigate GETs for RSC flights;
  //    the old generic networkFirst fallback could resolve to Response.error() and break
  //    /login, cookies, and post-refresh auth until users cleared site data.
  return;
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
        icon: '/icons/notification-icon-96.png',
        badge: '/icons/notification-badge-96.png',
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
  const scopeBase = self.registration?.scope || `${self.location.origin}/`;

  let path = '/dashboard';
  if (typeof notifData.url === 'string' && notifData.url.startsWith('/')) {
    path = notifData.url;
  } else if (notifData.newUserId || notifData.changedUserId) {
    path = '/dashboard/admin/users';
  } else if (notifData.feedbackId) {
    path = '/dashboard/admin/feedback';
  } else if (notifData.fellowId && notifData.achievementId) {
    path = '/dashboard/admin/users';
  } else if (notifData.channelId) {
    path = `/dashboard/chat?channelId=${encodeURIComponent(String(notifData.channelId))}`;
  } else if (notifData.discussionId) {
    path = `/dashboard/discussions/${encodeURIComponent(String(notifData.discussionId))}`;
  } else if (notifData.resourceId) {
    path = `/resources/${encodeURIComponent(String(notifData.resourceId))}`;
  } else if (notifData.liveQuizId) {
    path = `/dashboard/live-quiz/${encodeURIComponent(String(notifData.liveQuizId))}`;
  } else if (notifData.quizId) {
    path = `/quiz/${encodeURIComponent(String(notifData.quizId))}`;
  } else if (notifData.achievementId) {
    path = '/achievements';
  }

  const targetUrl = new URL(path, scopeBase).href;
  const scopeOrigin = new URL(scopeBase).origin;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        try {
          if (new URL(client.url).origin !== scopeOrigin) continue;
          client.postMessage({ type: 'NOTIF_NAVIGATE', href: targetUrl });
          await client.focus();
          return;
        } catch {
          continue;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
