self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Nuke ALL caches to fix the blank screen issue
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Bypass Service Worker completely for now. Let the browser handle the network.
  // This guarantees the app will load when clicked on the phone.
  return;
});
