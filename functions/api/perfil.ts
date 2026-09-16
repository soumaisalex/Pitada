import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { usuarios } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  return new Response(
    JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      primeiroNome: usuario.primeiroNome,
      email: usuario.email,
      telefone: usuario.telefone,
      chavePix: usuario.chavePix,
      isLojista: usuario.isLojista,
      isAdmin: usuario.isAdmin,
      saldoPitadas: usuario.saldoPitadas,
    }),
    { headers: { "content-type": "application/json" } }
  );
};

export const onRequestPatch: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!corpo) return respostaErro("Corpo da requisição inválido.");

  // Só campos não sensíveis por aqui — chave Pix e senha têm rotas próprias.
  const camposPermitidos: Record<string, string | null> = {};
  if (typeof corpo.nome === "string" && corpo.nome.trim()) camposPermitidos.nome = corpo.nome.trim();
  if (typeof corpo.primeiroNome === "string" && corpo.primeiroNome.trim()) {
    camposPermitidos.primeiroNome = corpo.primeiroNome.trim();
  }
  if (typeof corpo.telefone === "string") camposPermitidos.telefone = corpo.telefone.trim() || null;

  if (Object.keys(camposPermitidos).length === 0) {
    return respostaErro("Nenhum campo válido para atualizar.");
  }

  const db = getDb(env.DATABASE_URL);
  const [usuarioAtualizado] = await db
    .update(usuarios)
    .set(camposPermitidos)
    .where(eq(usuarios.id, usuario.id))
    .returning();

  return new Response(
    JSON.stringify({
      id: usuarioAtualizado.id,
      nome: usuarioAtualizado.nome,
      primeiroNome: usuarioAtualizado.primeiroNome,
      telefone: usuarioAtualizado.telefone,
    }),
    { headers: { "content-type": "application/json" } }
  );
};
