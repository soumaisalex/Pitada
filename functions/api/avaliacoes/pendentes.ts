import { and, eq, lte, asc } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes, itensTransacao, produtos, avaliacoes, lojas } from "../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SETE_MINUTOS_MS = 7 * 60 * 1000;

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const db = getDb(env.DATABASE_URL);
  const limite = new Date(Date.now() - SETE_MINUTOS_MS);

  const candidatas = await db
    .select()
    .from(transacoes)
    .where(
      and(
        eq(transacoes.usuarioOrigemId, usuario.id),
        eq(transacoes.tipo, "compra"),
        eq(transacoes.status, "concluida"),
        lte(transacoes.criadoEm, limite)
      )
    )
    .orderBy(asc(transacoes.criadoEm));

  for (const transacao of candidatas) {
    const itens = await db
      .select({ produtoId: produtos.id, nome: produtos.nome })
      .from(itensTransacao)
      .innerJoin(produtos, eq(produtos.id, itensTransacao.produtoId))
      .where(eq(itensTransacao.transacaoId, transacao.id));

    const avaliacoesExistentes = await db
      .select()
      .from(avaliacoes)
      .where(eq(avaliacoes.transacaoId, transacao.id));

    const produtosAvaliados = new Set(
      avaliacoesExistentes.filter((a) => a.tipo === "produto").map((a) => a.produtoId)
    );
    const lojaAvaliada = avaliacoesExistentes.some((a) => a.tipo === "loja");

    const itensPendentes = itens.filter((item) => !produtosAvaliados.has(item.produtoId));

    if (itensPendentes.length > 0 || !lojaAvaliada) {
      const [loja] = transacao.usuarioDestinoId
        ? await db.select().from(lojas).where(eq(lojas.usuarioId, transacao.usuarioDestinoId)).limit(1)
        : [];

      return new Response(
        JSON.stringify({
          transacaoId: transacao.id,
          lojaId: loja?.id ?? null,
          lojaNome: loja?.nomeLoja ?? "Loja",
          itensPendentes,
          lojaPendente: !lojaAvaliada,
        }),
        { headers: { "content-type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify(null), { headers: { "content-type": "application/json" } });
};
