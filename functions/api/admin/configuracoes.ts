import { getDb } from "../../../db/client";
import { configuracoes } from "../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const db = getDb(env.DATABASE_URL);
  const lista = await db.select().from(configuracoes).orderBy(configuracoes.chave);

  return new Response(JSON.stringify(lista), {
    headers: { "content-type": "application/json" },
  });
};
