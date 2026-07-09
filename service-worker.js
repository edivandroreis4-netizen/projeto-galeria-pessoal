const CACHE_NAME = 'galeria-pessoal-v7';
const RUNTIME_CACHE = 'galeria-pessoal-runtime-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './src/css/style.css',
  './src/js/app.js',
  './src/js/database.js',
  './src/assets/images/edivandro-lima.jpg',
  './src/assets/icons/favicon-32.png',
  './src/assets/icons/icon-192.png',
  './src/assets/icons/icon-512.png',
  './src/assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
