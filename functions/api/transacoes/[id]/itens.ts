import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { transacoes, itensTransacao, produtos } from "../../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const transacaoId = params.id as string;
  const db = getDb(env.DATABASE_URL);

  const [transacao] = await db.select().from(transacoes).where(eq(transacoes.id, transacaoId)).limit(1);
  if (!transacao) return respostaErro("Transação não encontrada.", 404);

  const participou =
    transacao.usuarioOrigemId === usuario.id || transacao.usuarioDestinoId === usuario.id;
  if (!participou) return respostaErro("Você não tem acesso a essa transação.", 403);

  const itens = await db
    .select({
      nome: produtos.nome,
      quantidade: itensTransacao.quantidade,
      valorUnitario: itensTransacao.valorUnitario,
      fotoUrl: produtos.fotoUrl,
    })
    .from(itensTransacao)
    .innerJoin(produtos, eq(produtos.id, itensTransacao.produtoId))
    .where(eq(itensTransacao.transacaoId, transacaoId));

  return new Response(JSON.stringify(itens), {
    headers: { "content-type": "application/json" },
  });
};
