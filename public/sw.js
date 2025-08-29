const CACHE_NAME = 'nutrifit-v2';
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);
  // Handle only same-origin requests
  if (reqUrl.origin !== self.location.origin) return;

  // Network-first for navigation requests to avoid stale app shell
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (_) {
        const cached = await caches.match(event.request);
        return cached || caches.match('/');
      }
    })());
    return;
  }

  // Cache-first with background revalidation for other requests
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      // Revalidate in background
      fetch(event.request).then(async (networkResponse) => {
        try {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        } catch {}
      }).catch(() => {});
      return cached;
    }
    try {
      const networkResponse = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, networkResponse.clone());
      return networkResponse;
    } catch (_) {
      return caches.match('/');
    }
  })());
});