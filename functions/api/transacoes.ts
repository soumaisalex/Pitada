import { desc, eq, or } from "drizzle-orm";
import { getDb } from "../../db/client";
import { transacoes } from "../../db/schema";
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
  const lista = await db
    .select()
    .from(transacoes)
    .where(or(eq(transacoes.usuarioOrigemId, usuario.id), eq(transacoes.usuarioDestinoId, usuario.id)))
    .orderBy(desc(transacoes.criadoEm))
    .limit(50);

  const comDirecao = lista.map((t) => ({
    id: t.id,
    codigo: t.codigo,
    tipo: t.tipo,
    valor: t.valor,
    status: t.status,
    criadoEm: t.criadoEm,
    direcao: t.usuarioDestinoId === usuario.id ? "entrada" : "saida",
  }));

  return new Response(JSON.stringify(comDirecao), {
    headers: { "content-type": "application/json" },
  });
};
