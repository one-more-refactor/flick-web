// flick — service worker. Cache-first app shell; /api/* is NEVER cached.
// The app must work identically without this file (registration is optional).

const VERSION = 'flick-shell-v0.3.0';

const SHELL = [
  '/app/',
  '/app/manifest.webmanifest',
  '/app/icons/icon.svg',
  '/app/icons/icon-maskable.svg',
  '/app/icons/icon-192.png',
  '/app/icons/icon-512.png',
  '/app/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // API is live data — network only, never cached, never served stale.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first (fresh index.html), cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/app/').then((hit) => hit ?? Response.error()),
      ),
    );
    return;
  }

  // Hashed assets & shell files: cache first, fill the cache at runtime.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
