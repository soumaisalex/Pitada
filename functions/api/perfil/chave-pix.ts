import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { usuarios, logsAuditoria } from "../../../db/schema";
import { verificarSenha } from "../../_lib/senha";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPatch: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as { novaChavePix?: string; senhaAtual?: string } | null;
  if (!corpo?.novaChavePix?.trim() || !corpo?.senhaAtual) {
    return respostaErro("Informe a nova chave Pix e a senha atual.");
  }

  const senhaCorreta = await verificarSenha(corpo.senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) {
    return respostaErro("Senha incorreta.", 401);
  }

  const db = getDb(env.DATABASE_URL);
  const chaveAnterior = usuario.chavePix;

  await db
    .update(usuarios)
    .set({ chavePix: corpo.novaChavePix.trim() })
    .where(eq(usuarios.id, usuario.id));

  // Registro em log de auditoria — ainda não temos envio de e-mail/notificação;
  // isso permite ao usuário ou ao admin conferir o histórico depois (ver Fase 8).
  await db.insert(logsAuditoria).values({
    adminId: null,
    acao: "alteracao_chave_pix",
    entidade: "usuarios",
    entidadeId: usuario.id,
    detalhes: { chaveAnterior: chaveAnterior ?? null },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};
