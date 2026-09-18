import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../db/client";
import { lojas, produtos, transacoes, itensTransacao } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { gerarCodigoComPrefixo } from "../_lib/codigo";
import { obterConfiguracaoNumerica } from "../_lib/configuracoes";
import { obterEventoAtivoParaLoja } from "../_lib/eventos";

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
    itens?: { produtoId: string; quantidade: number }[];
  } | null;

  if (!corpo?.itens?.length) {
    return respostaErro("Informe ao menos um item no carrinho.");
  }

  const db = getDb(env.DATABASE_URL);

  const [minhaLoja] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);
  if (!minhaLoja) return respostaErro("Você ainda não tem uma loja cadastrada.");
  if (minhaLoja.status !== "aprovada") return respostaErro("Sua loja precisa estar aprovada.", 403);

  const evento = await obterEventoAtivoParaLoja(env.DATABASE_URL, minhaLoja.id);
  if (!evento) {
    return respostaErro("Não há nenhum evento ativo agora com sua presença confirmada.", 403);
  }

  const produtoIds = corpo.itens.map((item) => item.produtoId);
  const produtosEncontrados = await db.select().from(produtos).where(inArray(produtos.id, produtoIds));

  let valorTotal = 0;
  const itensValidados: { produtoId: string; quantidade: number; valorUnitario: string }[] = [];

  for (const item of corpo.itens) {
    const produto = produtosEncontrados.find((p) => p.id === item.produtoId);
    if (!produto || produto.lojaId !== minhaLoja.id || !produto.ativo) {
      return respostaErro(`Produto inválido no carrinho.`);
    }
    if (!item.quantidade || item.quantidade <= 0) {
      return respostaErro(`Quantidade inválida para ${produto.nome}.`);
    }
    valorTotal += Number(produto.valorPitadas) * item.quantidade;
    itensValidados.push({
      produtoId: produto.id,
      quantidade: item.quantidade,
      valorUnitario: produto.valorPitadas,
    });
  }

  const tempoExpiracaoSegundos = await obterConfiguracaoNumerica(
    env.DATABASE_URL,
    "tempo_expiracao_qrcode_segundos",
    60
  );

  let codigo = gerarCodigoComPrefixo("V");
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    const [conflito] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
    if (!conflito) break;
    codigo = gerarCodigoComPrefixo("V");
  }

  const [novaVenda] = await db
    .insert(transacoes)
    .values({
      codigo,
      tipo: "compra",
      usuarioDestinoId: minhaLoja.usuarioId,
      eventoId: evento.id,
      valor: String(valorTotal),
      status: "pendente",
      expiraEm: new Date(Date.now() + tempoExpiracaoSegundos * 1000),
    })
    .returning();

  await db.insert(itensTransacao).values(
    itensValidados.map((item) => ({
      transacaoId: novaVenda.id,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
    }))
  );

  return new Response(
    JSON.stringify({
      id: novaVenda.id,
      codigo: novaVenda.codigo,
      valor: valorTotal,
      expiraEm: novaVenda.expiraEm,
    }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
};
