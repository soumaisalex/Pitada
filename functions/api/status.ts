// Exemplo mínimo de Cloudflare Pages Function.
// Acessível em /api/status quando publicado.
// Cada nova rota de API vira um novo arquivo aqui dentro de functions/api/.

interface Env {
  DATABASE_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};
