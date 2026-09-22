const CACHE = "tiangpass-shell-v5";
const WARM_CACHE = "tiangpass-warm-v1";
const SHELL = ["/", "/login", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== WARM_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "WARM_CACHE" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(WARM_CACHE);
      for (const url of data.urls) {
        if (typeof url !== "string") continue;
        try {
          const res = await fetch(url, { credentials: "same-origin" });
          if (res.ok) await cache.put(url, res.clone());
        } catch {
          // ignore
        }
      }
    })(),
  );
});

function shouldBypass(request) {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Url")) return true;
  // Client-side App Router fetches are not mode=navigate. Never intercept them.
  if (request.mode !== "navigate") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const warm = await caches.open(WARM_CACHE);
      const warmHit = await warm.match(request);
      if (warmHit) return warmHit;
      const cached = await caches.match(request);
      if (cached) return cached;

      const url = new URL(request.url);
      // Angler pass detail → offline wallet shell when possible
      const passMatch = url.pathname.match(/^\/pass\/([^/]+)\/?$/);
      if (passMatch) {
        const offlinePass = await warm.match(`/pass/${passMatch[1]}/offline`);
        if (offlinePass) return offlinePass;
      }

      const offline = await caches.match("/offline");
      if (offline) return offline;
      return new Response("Offline", {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }),
  );
});
