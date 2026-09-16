import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { lojas, participacoesEvento } from "../../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const eventoId = params.id as string;
  const db = getDb(env.DATABASE_URL);

  const [minhaLoja] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);
  if (!minhaLoja) return respostaErro("Você ainda não tem uma loja cadastrada.");
  if (minhaLoja.status !== "aprovada") {
    return respostaErro("Sua loja precisa estar aprovada para participar de eventos.", 403);
  }

  const [existente] = await db
    .select()
    .from(participacoesEvento)
    .where(and(eq(participacoesEvento.eventoId, eventoId), eq(participacoesEvento.lojaId, minhaLoja.id)))
    .limit(1);

  if (existente) {
    const [atualizada] = await db
      .update(participacoesEvento)
      .set({ status: "confirmado" })
      .where(eq(participacoesEvento.id, existente.id))
      .returning();
    return new Response(JSON.stringify(atualizada), { headers: { "content-type": "application/json" } });
  }

  const [nova] = await db
    .insert(participacoesEvento)
    .values({ eventoId, lojaId: minhaLoja.id, status: "confirmado" })
    .returning();

  return new Response(JSON.stringify(nova), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};

export const onRequestDelete: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const eventoId = params.id as string;
  const db = getDb(env.DATABASE_URL);

  const [minhaLoja] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);
  if (!minhaLoja) return respostaErro("Você ainda não tem uma loja cadastrada.");

  await db
    .update(participacoesEvento)
    .set({ status: "cancelado" })
    .where(and(eq(participacoesEvento.eventoId, eventoId), eq(participacoesEvento.lojaId, minhaLoja.id)));

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
