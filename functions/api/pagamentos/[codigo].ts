import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes, itensTransacao, produtos, lojas } from "../../../db/schema";
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

  const codigo = params.codigo as string;
  const db = getDb(env.DATABASE_URL);

  // Código de produto estático (compra rápida, sempre 1 unidade)
  if (codigo.startsWith("P")) {
    const [produto] = await db.select().from(produtos).where(eq(produtos.codigoEstatico, codigo)).limit(1);
    if (!produto || !produto.ativo) return respostaErro("Produto não encontrado ou indisponível.", 404);

    const [loja] = await db.select().from(lojas).where(eq(lojas.id, produto.lojaId)).limit(1);
    if (!loja || loja.status !== "aprovada") return respostaErro("Loja indisponível.", 404);

    return new Response(
      JSON.stringify({
        tipo: "produto",
        lojaNome: loja.nomeLoja,
        itens: [{ nome: produto.nome, quantidade: 1, valorUnitario: produto.valorPitadas, fotoUrl: produto.fotoUrl }],
        valorTotal: Number(produto.valorPitadas),
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // Sessão de carrinho (venda montada pelo lojista)
  const [venda] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
  if (!venda) return respostaErro("Código não encontrado.", 404);

  if (venda.status !== "pendente") {
    return respostaErro(
      venda.status === "expirada" ? "Essa sessão de pagamento expirou." : "Essa venda já foi processada.",
      410
    );
  }
  if (venda.expiraEm && new Date(venda.expiraEm) < new Date()) {
    await db.update(transacoes).set({ status: "expirada" }).where(eq(transacoes.id, venda.id));
    return respostaErro("Essa sessão de pagamento expirou.", 410);
  }

  const itens = await db
    .select({
      nome: produtos.nome,
      quantidade: itensTransacao.quantidade,
      valorUnitario: itensTransacao.valorUnitario,
      fotoUrl: produtos.fotoUrl,
    })
    .from(itensTransacao)
    .innerJoin(produtos, eq(produtos.id, itensTransacao.produtoId))
    .where(eq(itensTransacao.transacaoId, venda.id));

  const [loja] = venda.usuarioDestinoId
    ? await db.select().from(lojas).where(eq(lojas.usuarioId, venda.usuarioDestinoId)).limit(1)
    : [];

  return new Response(
    JSON.stringify({
      tipo: "sessao",
      lojaNome: loja?.nomeLoja ?? "Loja",
      itens,
      valorTotal: Number(venda.valor),
      expiraEm: venda.expiraEm,
    }),
    { headers: { "content-type": "application/json" } }
  );
};
