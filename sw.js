const CACHE_NAME = 'app-shell-v1';
const APP_ROOT = new URL('./', self.location.href);
const SHELL = [new URL('./', self.location.href).href, new URL('./index.html', self.location.href).href, new URL('./manifest.webmanifest', self.location.href).href, new URL('./icons/app.svg', self.location.href).href];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())); return response; }).catch(async () => (await caches.match(request)) || (await caches.match(new URL('./index.html', self.location.href).href))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())); return response; })));
});
