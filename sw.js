/* Service worker: η εφαρμογή ανοίγει και χωρίς σύνδεση, με την τελευταία ανάλυση που είχε φορτώσει. */
const VERSION = "uam-v12";
const SHELL = ["./", "index.html", "app.css", "core.js", "ui.js", "pf.js", "ocr.js", "plan.js", "brief.js", "bot.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CDN = /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net\/npm\/tesseract)\//;
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((x) => new Request(x, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = e.request.url;
  if (e.request.method !== "GET") return;
  const path = new URL(u).pathname;
  if (/\/(api|static|classic)(\/|$)/.test(path)) return; // πρόγραμμα υπολογιστή: ζωντανά, χωρίς cache
  if (u.startsWith(self.location.origin)) {
    // πρώτα το δίκτυο (νέα ανάλυση / νέα έκδοση), αλλιώς η αποθηκευμένη
    // no-cache: ρωτά πάντα τον server αν άλλαξε κάτι (μικρό 304 αν όχι), ώστε η νέα έκδοση να φαίνεται αμέσως
    e.respondWith(fetch(u, { cache: "no-cache", credentials: "same-origin" }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || (e.request.mode === "navigate" ? caches.match("index.html") : new Response("", { status: 503 })))));
  } else if (CDN.test(u)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return r; })));
  }
});
