import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { lojas } from "../../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const url = new URL(request.url);
  const statusFiltro = url.searchParams.get("status");

  const db = getDb(env.DATABASE_URL);
  const lista = statusFiltro
    ? await db.select().from(lojas).where(eq(lojas.status, statusFiltro as any))
    : await db.select().from(lojas);

  return new Response(JSON.stringify(lista), {
    headers: { "content-type": "application/json" },
  });
};
