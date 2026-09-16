import { getDb } from "../../db/client";
import { categorias } from "../../db/schema";
import { obterUsuarioAtual, obterAdminAtual, type EnvAuth } from "../_lib/auth";

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
  const lista = await db.select().from(categorias).orderBy(categorias.nome);
  return new Response(JSON.stringify(lista), {
    headers: { "content-type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Apenas o administrador pode criar categorias.", 403);

  const corpo = await request.json().catch(() => null) as { nome?: string } | null;
  if (!corpo?.nome?.trim()) return respostaErro("Informe o nome da categoria.");

  const db = getDb(env.DATABASE_URL);
  const [nova] = await db.insert(categorias).values({ nome: corpo.nome.trim() }).returning();

  return new Response(JSON.stringify(nova), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
