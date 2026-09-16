import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { lojas } from "../../db/schema";
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

  const db = getDb(env.DATABASE_URL);
  const [minhaLoja] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);

  return new Response(JSON.stringify(minhaLoja ?? null), {
    headers: { "content-type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as { nomeLoja?: string; logoUrl?: string } | null;
  if (!corpo?.nomeLoja?.trim()) return respostaErro("Informe o nome da loja.");
  if (!corpo?.logoUrl?.trim()) return respostaErro("A logo/imagem da loja é obrigatória.");

  const db = getDb(env.DATABASE_URL);

  const [existente] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);
  if (existente) return respostaErro("Você já tem uma loja cadastrada.");

  const [novaLoja] = await db
    .insert(lojas)
    .values({
      usuarioId: usuario.id,
      nomeLoja: corpo.nomeLoja.trim(),
      logoUrl: corpo.logoUrl.trim(),
    })
    .returning();

  return new Response(JSON.stringify(novaLoja), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
