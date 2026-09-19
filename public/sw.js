// Service worker mínimo, só para satisfazer os critérios de instalação como PWA.
// Não guarda cache nem funciona offline por enquanto — é só o suficiente para
// habilitar "Adicionar à tela inicial" no Android e o push no iOS (Fase 8).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Passa direto pra rede — sem cache customizado por enquanto.
  event.respondWith(fetch(event.request));
});
