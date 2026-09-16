import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { lojas, produtos, logsAuditoria } from "../../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../../_lib/auth";

const STATUS_VALIDOS = ["pendente", "aprovada", "reprovada", "suspensa"] as const;
type StatusLoja = (typeof STATUS_VALIDOS)[number];

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPatch: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const lojaId = params.id as string;
  const corpo = await request.json().catch(() => null) as { status?: string } | null;

  if (!corpo?.status || !STATUS_VALIDOS.includes(corpo.status as StatusLoja)) {
    return respostaErro(`Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.`);
  }
  const novoStatus = corpo.status as StatusLoja;

  const db = getDb(env.DATABASE_URL);
  const [loja] = await db.select().from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  if (!loja) return respostaErro("Loja não encontrada.", 404);

  const [lojaAtualizada] = await db
    .update(lojas)
    .set({ status: novoStatus, aprovadoPor: novoStatus === "aprovada" ? admin.id : loja.aprovadoPor })
    .where(eq(lojas.id, lojaId))
    .returning();

  // Regra combinada: loja suspensa => todos os produtos ficam inativos automaticamente,
  // e todo o ambiente de vendas (produtos/avaliações/demais informações) fica indisponível.
  if (novoStatus === "suspensa") {
    await db.update(produtos).set({ ativo: false }).where(eq(produtos.lojaId, lojaId));
  }

  await db.insert(logsAuditoria).values({
    adminId: admin.id,
    acao: `loja_status_${novoStatus}`,
    entidade: "lojas",
    entidadeId: lojaId,
    detalhes: { statusAnterior: loja.status, statusNovo: novoStatus },
  });

  return new Response(JSON.stringify(lojaAtualizada), {
    headers: { "content-type": "application/json" },
  });
};
