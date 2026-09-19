import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { configuracoes, logsAuditoria } from "../../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPatch: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const corpo = await request.json().catch(() => null) as { valor?: string } | null;
  if (corpo?.valor === undefined || corpo.valor === null || corpo.valor === "") {
    return respostaErro("Informe o novo valor.");
  }

  const chave = params.chave as string;
  const db = getDb(env.DATABASE_URL);

  const [configAnterior] = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1);
  if (!configAnterior) return respostaErro("Parâmetro não encontrado.", 404);

  const [configAtualizada] = await db
    .update(configuracoes)
    .set({ valor: corpo.valor })
    .where(eq(configuracoes.chave, chave))
    .returning();

  await db.insert(logsAuditoria).values({
    adminId: admin.id,
    acao: "configuracao_atualizada",
    entidade: "configuracoes",
    entidadeId: chave,
    detalhes: { valorAnterior: configAnterior.valor, valorNovo: corpo.valor },
  });

  return new Response(JSON.stringify(configAtualizada), {
    headers: { "content-type": "application/json" },
  });
};
