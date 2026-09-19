import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { transacoes, itensTransacao, avaliacoes, lojas } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { obterConfiguracaoNumerica } from "../_lib/configuracoes";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as {
    transacaoId?: string;
    tipo?: "produto" | "loja";
    produtoId?: string;
    nota?: number;
    comentario?: string;
  } | null;

  if (!corpo?.transacaoId || !corpo?.tipo || !corpo?.nota) {
    return respostaErro("Informe a transação, o tipo e a nota.");
  }
  if (corpo.nota < 1 || corpo.nota > 10) {
    return respostaErro("A nota precisa ser de 1 a 10.");
  }
  if (corpo.tipo === "produto" && !corpo.produtoId) {
    return respostaErro("Informe o produto avaliado.");
  }

  const db = getDb(env.DATABASE_URL);

  const limiteComentario = await obterConfiguracaoNumerica(env.DATABASE_URL, "limite_comentario_caracteres", 50);
  if (corpo.comentario && corpo.comentario.length > limiteComentario) {
    return respostaErro(`O comentário pode ter no máximo ${limiteComentario} caracteres.`);
  }

  const [transacao] = await db.select().from(transacoes).where(eq(transacoes.id, corpo.transacaoId)).limit(1);
  if (!transacao || transacao.usuarioOrigemId !== usuario.id) {
    return respostaErro("Transação não encontrada.", 404);
  }
  if (transacao.tipo !== "compra" || transacao.status !== "concluida") {
    return respostaErro("Essa transação não pode ser avaliada.", 403);
  }
  if (!transacao.usuarioDestinoId) return respostaErro("Transação inválida.", 500);

  const [loja] = await db.select().from(lojas).where(eq(lojas.usuarioId, transacao.usuarioDestinoId)).limit(1);
  if (!loja) return respostaErro("Loja não encontrada.", 404);

  if (corpo.tipo === "produto") {
    const [item] = await db
      .select()
      .from(itensTransacao)
      .where(and(eq(itensTransacao.transacaoId, transacao.id), eq(itensTransacao.produtoId, corpo.produtoId!)))
      .limit(1);
    if (!item) return respostaErro("Esse produto não faz parte dessa compra.", 403);

    const [jaAvaliado] = await db
      .select()
      .from(avaliacoes)
      .where(
        and(
          eq(avaliacoes.transacaoId, transacao.id),
          eq(avaliacoes.tipo, "produto"),
          eq(avaliacoes.produtoId, corpo.produtoId!)
        )
      )
      .limit(1);
    if (jaAvaliado) return respostaErro("Esse produto já foi avaliado.", 409);
  } else {
    const [jaAvaliado] = await db
      .select()
      .from(avaliacoes)
      .where(and(eq(avaliacoes.transacaoId, transacao.id), eq(avaliacoes.tipo, "loja")))
      .limit(1);
    if (jaAvaliado) return respostaErro("Essa loja já foi avaliada para essa compra.", 409);
  }

  const [novaAvaliacao] = await db
    .insert(avaliacoes)
    .values({
      transacaoId: transacao.id,
      tipo: corpo.tipo,
      produtoId: corpo.tipo === "produto" ? corpo.produtoId : null,
      lojaId: loja.id,
      nota: corpo.nota,
      comentario: corpo.comentario?.trim() || null,
      apelidoExibido: usuario.primeiroNome,
    })
    .returning();

  return new Response(JSON.stringify(novaAvaliacao), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
