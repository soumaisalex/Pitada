import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes, usuarios } from "../../../db/schema";

interface Env {
  DATABASE_URL: string;
  EFI_PROXY_URL: string;
  EFI_PROXY_SECRET: string;
}

interface PixNotificado {
  txid: string;
  valor: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corpo = await request.json().catch(() => null) as { pix?: PixNotificado[] } | null;

  // Responde 200 mesmo em payload inesperado — o Efí reenvia notificações que
  // falham, e não queremos reenvios infinitos por causa de um formato que não
  // reconhecemos.
  if (!corpo?.pix?.length) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }

  const db = getDb(env.DATABASE_URL);

  for (const pix of corpo.pix) {
    try {
      // Nunca confiamos só no payload do webhook — confirmamos com a própria
      // API do Efí (via proxy) antes de creditar qualquer saldo.
      const resposta = await fetch(`${env.EFI_PROXY_URL}/cobrancas/${pix.txid}`, {
        headers: { "X-Internal-Secret": env.EFI_PROXY_SECRET },
      });
      if (!resposta.ok) continue;

      const cobrancaConfirmada = await resposta.json() as { status?: string };
      if (cobrancaConfirmada.status !== "CONCLUIDA") continue;

      const [transacao] = await db
        .select()
        .from(transacoes)
        .where(eq(transacoes.txidEfi, pix.txid))
        .limit(1);
      if (!transacao) continue;

      // Atualiza só se ainda estiver pendente — protege contra o Efí reenviar
      // a mesma notificação mais de uma vez (creditaria em dobro).
      const [transacaoAtualizada] = await db
        .update(transacoes)
        .set({ status: "concluida" })
        .where(and(eq(transacoes.id, transacao.id), eq(transacoes.status, "pendente")))
        .returning();

      if (transacaoAtualizada && transacaoAtualizada.usuarioDestinoId) {
        await db
          .update(usuarios)
          .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${transacaoAtualizada.valor}` })
          .where(eq(usuarios.id, transacaoAtualizada.usuarioDestinoId));
      }
    } catch {
      // Segue para o próximo item da lista — um erro isolado não deve
      // impedir o processamento dos demais nem fazer o Efí reenviar tudo.
      continue;
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
