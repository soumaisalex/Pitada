import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes, usuarios } from "../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

interface Env extends EnvAuth {
  EFI_PROXY_URL: string;
  EFI_PROXY_SECRET: string;
}

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const db = getDb(env.DATABASE_URL);
  const [transacao] = await db
    .select()
    .from(transacoes)
    .where(and(eq(transacoes.id, params.id as string), eq(transacoes.usuarioOrigemId, usuario.id)))
    .limit(1);

  if (!transacao) return respostaErro("Transação não encontrada.", 404);

  // Já resolvida antes — não precisa consultar o Efí de novo.
  if (transacao.status !== "pendente") {
    return new Response(JSON.stringify({ status: transacao.status }), {
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const resposta = await fetch(`${env.EFI_PROXY_URL}/envios/${transacao.txidEfi}`, {
      headers: { "X-Internal-Secret": env.EFI_PROXY_SECRET },
    });
    if (!resposta.ok) {
      // Ainda não conseguimos confirmar — o frontend tenta de novo no próximo ciclo.
      return new Response(JSON.stringify({ status: "pendente" }), {
        headers: { "content-type": "application/json" },
      });
    }

    const dadosEnvio = await resposta.json() as { status?: string };
    const valorTotalDebitado = Number(transacao.valor) + Number(transacao.taxaPix);

    if (dadosEnvio.status === "REALIZADO") {
      await db
        .update(transacoes)
        .set({ status: "concluida" })
        .where(and(eq(transacoes.id, transacao.id), eq(transacoes.status, "pendente")));
      return new Response(JSON.stringify({ status: "concluida" }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (dadosEnvio.status && dadosEnvio.status !== "EM_PROCESSAMENTO") {
      // Qualquer status terminal que não seja sucesso: estorna o saldo.
      const [transacaoAtualizada] = await db
        .update(transacoes)
        .set({ status: "cancelada" })
        .where(and(eq(transacoes.id, transacao.id), eq(transacoes.status, "pendente")))
        .returning();

      if (transacaoAtualizada) {
        await db
          .update(usuarios)
          .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valorTotalDebitado}` })
          .where(eq(usuarios.id, usuario.id));
      }

      return new Response(JSON.stringify({ status: "cancelada" }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pendente" }), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ status: "pendente" }), {
      headers: { "content-type": "application/json" },
    });
  }
};
