const CACHE_NAME="maum-card-v55-card-direct-1779568000";
const ASSETS=["/","/index.html","/view.html","/card.html","/manifest.webmanifest","/icon-192.png","/icon-512.png","/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

// Network-first for navigation (HTML pages) so updates are always picked up.
// Cache-first for static assets.
self.addEventListener("fetch", e => {
  const req = e.request;
  // Only handle GET
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // Don't intercept non-same-origin
  if(url.origin !== location.origin) return;
  // Strip hash for cache key (hash is client-side only)
  const cacheKey = url.pathname + url.search;

  // Navigation requests (HTML) -> network-first, fallback to cache
  if(req.mode === "navigate" || req.destination === "document"){
    e.respondWith(
      fetch(req).then(resp => {
        // Cache fresh copy
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match(req).then(c => c || caches.match("/index.html")))
    );
    return;
  }

  // Other assets -> cache-first
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(()=>{});
      return resp;
    }))
  );
});
