// Service worker ELP Hub : l'application s'ouvre même sans connexion.
// - Pages : réseau d'abord, copie en cache en secours.
// - Fichiers statiques (JS, CSS, images, polices) : cache d'abord.
const CACHE = "elp-hub-v2";
const PAGES = ["/", "/tableau", "/candidats", "/moi", "/scan", "/agence", "/carte", "/chapitres", "/cohortes"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PAGES).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // tuiles de carte, Supabase : pas de cache ici
  if (url.searchParams.has("_rsc")) return; // navigations internes de Next : laissées au réseau

  const statique = url.pathname.startsWith("/_next/static/") || /\.(png|jpg|svg|woff2?|ico)$/.test(url.pathname);
  if (statique) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copie = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copie));
        return res;
      })),
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copie = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copie));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match("/"))),
    );
  }
});
