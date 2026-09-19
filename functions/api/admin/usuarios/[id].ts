import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { usuarios, logsAuditoria } from "../../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../../_lib/auth";

const STATUS_VALIDOS = ["ativo", "suspenso"] as const;

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPatch: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const corpo = await request.json().catch(() => null) as { status?: string } | null;
  if (!corpo?.status || !STATUS_VALIDOS.includes(corpo.status as (typeof STATUS_VALIDOS)[number])) {
    return respostaErro("Status inválido. Use 'ativo' ou 'suspenso'.");
  }

  const usuarioId = params.id as string;
  if (usuarioId === admin.id) return respostaErro("Você não pode alterar o próprio status.");

  const db = getDb(env.DATABASE_URL);
  const [usuarioAtualizado] = await db
    .update(usuarios)
    .set({ status: corpo.status as (typeof STATUS_VALIDOS)[number] })
    .where(eq(usuarios.id, usuarioId))
    .returning();

  if (!usuarioAtualizado) return respostaErro("Usuário não encontrado.", 404);

  await db.insert(logsAuditoria).values({
    adminId: admin.id,
    acao: `usuario_status_${corpo.status}`,
    entidade: "usuarios",
    entidadeId: usuarioId,
    detalhes: null,
  });

  return new Response(JSON.stringify({ ok: true, status: usuarioAtualizado.status }), {
    headers: { "content-type": "application/json" },
  });
};
