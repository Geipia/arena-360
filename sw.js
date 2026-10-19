/* Service worker minimal d'Arena 360 : permet l'installation sur téléphone.
   Il ne garde rien en cache (les résultats doivent toujours être frais) ; hors connexion, il affiche un message. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='background:#06070c;color:#f2f4fb;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center'><div><h1>Pas de connexion</h1><p>Arena 360 a besoin d'Internet pour afficher les résultats en direct.</p></div>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
