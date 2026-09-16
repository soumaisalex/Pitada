import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { lojas, produtos } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { gerarCodigoComPrefixo } from "../_lib/codigo";

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
  if (!minhaLoja) return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });

  const lista = await db.select().from(produtos).where(eq(produtos.lojaId, minhaLoja.id));
  return new Response(JSON.stringify(lista), { headers: { "content-type": "application/json" } });
};

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as {
    nome?: string;
    descricao?: string;
    valorPitadas?: number | string;
    fotoUrl?: string;
    categoriaId?: number;
  } | null;

  if (!corpo?.nome?.trim() || !corpo?.valorPitadas || !corpo?.categoriaId) {
    return respostaErro("Nome, valor e categoria são obrigatórios.");
  }

  const db = getDb(env.DATABASE_URL);
  const [minhaLoja] = await db.select().from(lojas).where(eq(lojas.usuarioId, usuario.id)).limit(1);

  if (!minhaLoja) return respostaErro("Você ainda não tem uma loja cadastrada.");
  if (minhaLoja.status !== "aprovada") {
    return respostaErro("Sua loja precisa estar aprovada pelo administrador para cadastrar produtos.", 403);
  }

  // Gera o código estático do QR de compra rápida, garantindo que seja único.
  let codigoEstatico = gerarCodigoComPrefixo("P");
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    const [conflito] = await db
      .select()
      .from(produtos)
      .where(eq(produtos.codigoEstatico, codigoEstatico))
      .limit(1);
    if (!conflito) break;
    codigoEstatico = gerarCodigoComPrefixo("P");
  }

  const [novoProduto] = await db
    .insert(produtos)
    .values({
      lojaId: minhaLoja.id,
      categoriaId: corpo.categoriaId,
      nome: corpo.nome.trim(),
      descricao: corpo.descricao?.trim() || null,
      valorPitadas: String(corpo.valorPitadas),
      fotoUrl: corpo.fotoUrl?.trim() || null,
      codigoEstatico,
    })
    .returning();

  return new Response(JSON.stringify(novoProduto), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
