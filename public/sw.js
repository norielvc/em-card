// EM Card Admin Service Worker
const CACHE_NAME = 'em-card-admin-v3';
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/manifest.json',
  '/em-main-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── Skip non-GET requests entirely ──────────────────────────────
  if (event.request.method !== 'GET') return;

  // ── Skip ALL cross-origin requests (fonts, CDNs, APIs, Supabase) ─
  // Let the browser handle them directly — no SW interception.
  if (url.origin !== self.location.origin) return;

  // ── Skip Next.js API routes ──────────────────────────────────────
  if (url.pathname.startsWith('/api/')) return;

  // ── Skip Next.js internal build assets (_next/) ─────────────────
  if (url.pathname.startsWith('/_next/')) return;

  // Network-first strategy for same-origin navigation and pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          // Must always return a valid Response
          return cached || new Response('Offline – no cached version available.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});
