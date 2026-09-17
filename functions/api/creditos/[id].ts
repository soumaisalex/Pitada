import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes } from "../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const db = getDb(env.DATABASE_URL);
  const [transacao] = await db
    .select()
    .from(transacoes)
    .where(and(eq(transacoes.id, params.id as string), eq(transacoes.usuarioDestinoId, usuario.id)))
    .limit(1);

  if (!transacao) return respostaErro("Transação não encontrada.", 404);

  return new Response(JSON.stringify({ status: transacao.status }), {
    headers: { "content-type": "application/json" },
  });
};
