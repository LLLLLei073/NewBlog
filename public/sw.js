/* 过渡用退役 Worker：旧页面再次请求 /sw.js 时也会主动清理。 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lllllei-'))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.registration.unregister()),
  );
});
