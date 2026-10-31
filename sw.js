/* Service worker: η εφαρμογή ανοίγει και χωρίς σύνδεση. Τα δεδομένα αγοράς ΔΕΝ περνούν από εδώ. */
const VERSION = "uam-v1";
const SHELL = ["./", "index.html", "app.css", "js/core.js", "js/ui.js", "js/engine.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const CDN = /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = e.request.url;
  if (e.request.method !== "GET") return;
  const same = u.startsWith(self.location.origin);
  if (same) {
    // πρώτα το δίκτυο (για νέες εκδόσεις), αλλιώς η αποθηκευμένη
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
  } else if (CDN.test(u)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return r; })));
  }
});
