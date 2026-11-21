// Heal Your Heart PHR Service Worker for PWA Support
const CACHE_NAME = "hyh-phr-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/hyh-192.png",
  "/icons/hyh-512.png",
  "/HYH.png"
];

// Install: precache critical app assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("Failed to precache some offline resources:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first strategy with cache fallback for offline resilience
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip API / non-http calls
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Skip API queries so dynamic clinical EHR data stays fresh
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // If a navigation request fails offline, fallback to index
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});
