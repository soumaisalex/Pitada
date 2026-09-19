import { avg, count, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { lojas, avaliacoes } from "../../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../../_lib/auth";

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

  const listaLojas = await db.select().from(lojas).where(eq(lojas.status, "aprovada"));

  const medias = await db
    .select({
      lojaId: avaliacoes.lojaId,
      media: avg(avaliacoes.nota),
      total: count(avaliacoes.id),
    })
    .from(avaliacoes)
    .where(eq(avaliacoes.tipo, "loja"))
    .groupBy(avaliacoes.lojaId);

  const mediasPorLoja = new Map(medias.map((m) => [m.lojaId, m]));

  const resultado = listaLojas.map((loja) => {
    const media = mediasPorLoja.get(loja.id);
    return {
      id: loja.id,
      nomeLoja: loja.nomeLoja,
      logoUrl: loja.logoUrl,
      mediaAvaliacao: media ? Number(media.media) : null,
      totalAvaliacoes: media ? Number(media.total) : 0,
    };
  });

  return new Response(JSON.stringify(resultado), {
    headers: { "content-type": "application/json" },
  });
};
