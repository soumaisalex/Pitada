import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { transacoes, usuarios, cancelamentos, logsAuditoria } from "../../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../../_lib/auth";
import { verificarSenha } from "../../../_lib/senha";
import { obterConfiguracaoNumerica } from "../../../_lib/configuracoes";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as { motivo?: string; senhaAtual?: string } | null;
  if (!corpo?.motivo?.trim()) return respostaErro("Selecione o motivo do cancelamento.");
  if (!corpo?.senhaAtual) return respostaErro("Confirme sua senha para cancelar.");

  const senhaCorreta = await verificarSenha(corpo.senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) return respostaErro("Senha incorreta.", 401);

  const db = getDb(env.DATABASE_URL);
  const transacaoId = params.id as string;

  const [transacao] = await db.select().from(transacoes).where(eq(transacoes.id, transacaoId)).limit(1);
  if (!transacao) return respostaErro("Transação não encontrada.", 404);

  if (transacao.tipo !== "compra") {
    return respostaErro("Só é possível cancelar vendas (compras entre cliente e lojista).");
  }
  if (transacao.status !== "concluida") {
    return respostaErro("Essa venda não está mais disponível para cancelamento.", 410);
  }

  // Permissão: só o lojista dono da venda (quem recebeu) ou o administrador.
  // O cliente NUNCA pode solicitar isso diretamente, por decisão do projeto.
  const ehDono = transacao.usuarioDestinoId === usuario.id;
  if (!usuario.isAdmin && !ehDono) {
    return respostaErro("Você não pode cancelar essa venda.", 403);
  }

  // Janela de tempo — não se aplica ao administrador, só ao lojista.
  if (!usuario.isAdmin) {
    const janelaHoras = await obterConfiguracaoNumerica(env.DATABASE_URL, "janela_cancelamento_horas", 3);
    const horasDecorridas = (Date.now() - new Date(transacao.criadoEm).getTime()) / (1000 * 60 * 60);
    if (horasDecorridas > janelaHoras) {
      return respostaErro(
        `O prazo de ${janelaHoras}h para cancelar essa venda já passou. Fale com o administrador.`,
        403
      );
    }
  }

  if (!transacao.usuarioDestinoId || !transacao.usuarioOrigemId) {
    return respostaErro("Venda inválida para cancelamento.", 500);
  }

  const valor = Number(transacao.valor);

  // Debita do vendedor de forma atômica — só passa se ele ainda tiver saldo
  // suficiente pra devolver (evita o golpe de sacar e depois pedir estorno).
  const [vendedorAtualizado] = await db
    .update(usuarios)
    .set({ saldoPitadas: sql`${usuarios.saldoPitadas} - ${valor}` })
    .where(and(eq(usuarios.id, transacao.usuarioDestinoId), sql`${usuarios.saldoPitadas} >= ${valor}`))
    .returning();

  if (!vendedorAtualizado) {
    return respostaErro("O vendedor não tem saldo suficiente no momento para reverter essa venda.");
  }

  // Só cancela se ainda estiver concluída — evita cancelar duas vezes.
  const [transacaoAtualizada] = await db
    .update(transacoes)
    .set({ status: "cancelada" })
    .where(and(eq(transacoes.id, transacao.id), eq(transacoes.status, "concluida")))
    .returning();

  if (!transacaoAtualizada) {
    // Alguém cancelou entre nossa checagem e agora — devolve o saldo do vendedor.
    await db
      .update(usuarios)
      .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valor}` })
      .where(eq(usuarios.id, transacao.usuarioDestinoId));
    return respostaErro("Essa venda já tinha sido cancelada.", 410);
  }

  await db
    .update(usuarios)
    .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valor}` })
    .where(eq(usuarios.id, transacao.usuarioOrigemId));

  await db.insert(cancelamentos).values({
    transacaoId: transacao.id,
    iniciadoPor: usuario.id,
    motivo: corpo.motivo.trim(),
    confirmadoComSenha: true,
  });

  await db.insert(logsAuditoria).values({
    adminId: usuario.isAdmin ? usuario.id : null,
    acao: "cancelamento_venda",
    entidade: "transacoes",
    entidadeId: transacao.id,
    detalhes: { motivo: corpo.motivo.trim(), iniciadoPor: usuario.id, valor },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};
