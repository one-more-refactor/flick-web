// flick — the app moved to /app/ (its worker lives at /app/sw.js now).
// This file exists so clients that installed the old scope-/ worker fetch a
// successful update that immediately retires itself and reloads the page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url))),
  );
});
