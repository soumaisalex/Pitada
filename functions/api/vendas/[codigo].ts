import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { transacoes } from "../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env, params }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const db = getDb(env.DATABASE_URL);
  const [venda] = await db
    .select()
    .from(transacoes)
    .where(eq(transacoes.codigo, params.codigo as string))
    .limit(1);

  if (!venda || venda.usuarioDestinoId !== usuario.id) {
    return respostaErro("Venda não encontrada.", 404);
  }

  // Marca como expirada se o tempo já passou e ainda ninguém pagou.
  if (venda.status === "pendente" && venda.expiraEm && new Date(venda.expiraEm) < new Date()) {
    await db.update(transacoes).set({ status: "expirada" }).where(eq(transacoes.id, venda.id));
    return new Response(JSON.stringify({ status: "expirada" }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: venda.status }), {
    headers: { "content-type": "application/json" },
  });
};
