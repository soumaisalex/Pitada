import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { transacoes, itensTransacao, produtos, lojas, usuarios } from "../../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../../_lib/auth";
import { verificarSenha } from "../../../_lib/senha";
import { gerarCodigoComPrefixo } from "../../../_lib/codigo";
import { obterEventoAtivoParaLoja } from "../../../_lib/eventos";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const comprador = await obterUsuarioAtual(request, env);
  if (!comprador) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as { senhaAtual?: string } | null;
  if (!corpo?.senhaAtual) return respostaErro("Confirme sua senha para pagar.");

  const senhaCorreta = await verificarSenha(corpo.senhaAtual, comprador.senhaHash);
  if (!senhaCorreta) return respostaErro("Senha incorreta.", 401);

  const codigo = params.codigo as string;
  const db = getDb(env.DATABASE_URL);

  // ---------- Produto estático: cria e conclui a transação na hora ----------
  if (codigo.startsWith("P")) {
    const [produto] = await db.select().from(produtos).where(eq(produtos.codigoEstatico, codigo)).limit(1);
    if (!produto || !produto.ativo) return respostaErro("Produto não encontrado ou indisponível.", 404);

    const [loja] = await db.select().from(lojas).where(eq(lojas.id, produto.lojaId)).limit(1);
    if (!loja || loja.status !== "aprovada") return respostaErro("Loja indisponível.", 404);

    const evento = await obterEventoAtivoParaLoja(env.DATABASE_URL, loja.id);
    if (!evento) return respostaErro("Não há evento ativo agora para essa loja.", 403);

    const valor = Number(produto.valorPitadas);

    const [compradorAtualizado] = await db
      .update(usuarios)
      .set({ saldoPitadas: sql`${usuarios.saldoPitadas} - ${valor}` })
      .where(and(eq(usuarios.id, comprador.id), sql`${usuarios.saldoPitadas} >= ${valor}`))
      .returning();

    if (!compradorAtualizado) return respostaErro("Saldo insuficiente.");

    await db
      .update(usuarios)
      .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valor}` })
      .where(eq(usuarios.id, loja.usuarioId));

    let codigoTransacao = gerarCodigoComPrefixo("V");
    for (let tentativas = 0; tentativas < 5; tentativas++) {
      const [conflito] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigoTransacao)).limit(1);
      if (!conflito) break;
      codigoTransacao = gerarCodigoComPrefixo("V");
    }

    const [novaTransacao] = await db
      .insert(transacoes)
      .values({
        codigo: codigoTransacao,
        tipo: "compra",
        usuarioOrigemId: comprador.id,
        usuarioDestinoId: loja.usuarioId,
        eventoId: evento.id,
        valor: String(valor),
        status: "concluida",
      })
      .returning();

    await db.insert(itensTransacao).values({
      transacaoId: novaTransacao.id,
      produtoId: produto.id,
      quantidade: 1,
      valorUnitario: produto.valorPitadas,
    });

    return new Response(JSON.stringify({ ok: true, codigo: novaTransacao.codigo, valor }), {
      headers: { "content-type": "application/json" },
    });
  }

  // ---------- Sessão de carrinho: confirma a venda já criada pelo lojista ----------
  const [venda] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
  if (!venda) return respostaErro("Código não encontrado.", 404);
  if (venda.status !== "pendente") return respostaErro("Essa venda não está mais disponível para pagamento.", 410);
  if (venda.expiraEm && new Date(venda.expiraEm) < new Date()) {
    await db.update(transacoes).set({ status: "expirada" }).where(eq(transacoes.id, venda.id));
    return respostaErro("Essa sessão de pagamento expirou.", 410);
  }
  if (!venda.usuarioDestinoId) return respostaErro("Venda inválida.", 500);

  const valor = Number(venda.valor);

  const [compradorAtualizado] = await db
    .update(usuarios)
    .set({ saldoPitadas: sql`${usuarios.saldoPitadas} - ${valor}` })
    .where(and(eq(usuarios.id, comprador.id), sql`${usuarios.saldoPitadas} >= ${valor}`))
    .returning();

  if (!compradorAtualizado) return respostaErro("Saldo insuficiente.");

  // Só confirma se ainda estiver pendente — evita pagar a mesma sessão duas vezes.
  const [vendaAtualizada] = await db
    .update(transacoes)
    .set({ usuarioOrigemId: comprador.id, status: "concluida" })
    .where(and(eq(transacoes.id, venda.id), eq(transacoes.status, "pendente")))
    .returning();

  if (!vendaAtualizada) {
    // Alguém confirmou entre nossa checagem e agora — estorna o comprador.
    await db
      .update(usuarios)
      .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valor}` })
      .where(eq(usuarios.id, comprador.id));
    return respostaErro("Essa venda já foi paga por outra pessoa.", 410);
  }

  await db
    .update(usuarios)
    .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valor}` })
    .where(eq(usuarios.id, venda.usuarioDestinoId));

  return new Response(JSON.stringify({ ok: true, codigo: venda.codigo, valor }), {
    headers: { "content-type": "application/json" },
  });
};
