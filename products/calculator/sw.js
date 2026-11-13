/* 手边计算器 · 离线缓存。只缓存本产品静态文件，不做网络同步。 */
const CACHE = 'live-calc-v1'
const ASSETS = [
  '/web/',
  '/web/index.html',
  '/web/styles.css',
  '/web/tokens.css',
  '/web/app.js',
  '/web/manifest.webmanifest',
  '/web/icons/icon.svg',
  '/src/core/index.js',
  '/src/core/engine.js',
  '/src/core/entry.js',
  '/src/core/arithmetic.js',
  '/src/core/format.js',
  '/src/core/history.js',
  '/src/core/errors.js',
  '/src/core/labels.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((response) => {
      if (response.ok && (url.pathname.startsWith('/web/') || url.pathname.startsWith('/src/'))) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('/web/index.html')
      return new Response('offline', { status: 503, headers: { 'content-type': 'text/plain' } })
    }))
  )
})
