import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { transacoes } from "../../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const codigo = (params.codigo as string).toUpperCase();
  const db = getDb(env.DATABASE_URL);

  const [transacao] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
  if (!transacao) return respostaErro("Nenhuma transação encontrada com esse código.", 404);

  return new Response(JSON.stringify(transacao), {
    headers: { "content-type": "application/json" },
  });
};
