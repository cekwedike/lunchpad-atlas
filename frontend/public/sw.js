/**
 * ATLAS PWA Service Worker
 *
 * Strategies:
 *  - /_next/static/*  → Cache First  (hashed filenames, safe forever)
 *  - /icons/*, /favicon.ico, /manifest.webmanifest → Cache First
 *  - /api/*           → Network Only (real-time data must be fresh)
 *  - navigation       → Network First → offline fallback page
 *  - everything else  → Network First → cache fallback
 */

const CACHE_VERSION = 'v1';
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
      self.clients.claim(),
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

  // 5. Navigation (HTML pages) — Network First with offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request));
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

/** Tries network first; falls back to offline page on failure (navigation only). */
async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(OFFLINE_PAGE);
    return cached ?? Response.error();
  }
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
