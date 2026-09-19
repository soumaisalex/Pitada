import { and, avg, count, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { lojas, produtos, avaliacoes } from "../../../../db/schema";
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

  const lojaId = params.id as string;
  const db = getDb(env.DATABASE_URL);

  const [loja] = await db.select().from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  if (!loja || loja.status !== "aprovada") return respostaErro("Loja não encontrada.", 404);

  const [mediaLoja] = await db
    .select({ media: avg(avaliacoes.nota), total: count(avaliacoes.id) })
    .from(avaliacoes)
    .where(and(eq(avaliacoes.tipo, "loja"), eq(avaliacoes.lojaId, lojaId)));

  const comentariosLoja = await db
    .select({
      nota: avaliacoes.nota,
      comentario: avaliacoes.comentario,
      apelidoExibido: avaliacoes.apelidoExibido,
      criadoEm: avaliacoes.criadoEm,
    })
    .from(avaliacoes)
    .where(and(eq(avaliacoes.tipo, "loja"), eq(avaliacoes.lojaId, lojaId), isNotNull(avaliacoes.comentario)))
    .orderBy(desc(avaliacoes.criadoEm))
    .limit(20);

  const listaProdutos = await db
    .select()
    .from(produtos)
    .where(and(eq(produtos.lojaId, lojaId), eq(produtos.ativo, true)));

  const mediasProdutos = await db
    .select({ produtoId: avaliacoes.produtoId, media: avg(avaliacoes.nota), total: count(avaliacoes.id) })
    .from(avaliacoes)
    .where(eq(avaliacoes.tipo, "produto"))
    .groupBy(avaliacoes.produtoId);

  const mediasPorProduto = new Map(mediasProdutos.map((m) => [m.produtoId, m]));

  const produtosComMedia = listaProdutos.map((produto) => {
    const media = mediasPorProduto.get(produto.id);
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      valorPitadas: produto.valorPitadas,
      fotoUrl: produto.fotoUrl,
      mediaAvaliacao: media ? Number(media.media) : null,
      totalAvaliacoes: media ? Number(media.total) : 0,
    };
  });

  return new Response(
    JSON.stringify({
      id: loja.id,
      nomeLoja: loja.nomeLoja,
      logoUrl: loja.logoUrl,
      mediaAvaliacao: mediaLoja?.total ? Number(mediaLoja.media) : null,
      totalAvaliacoes: mediaLoja?.total ? Number(mediaLoja.total) : 0,
      comentarios: comentariosLoja,
      produtos: produtosComMedia,
    }),
    { headers: { "content-type": "application/json" } }
  );
};
