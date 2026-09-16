import { getDb } from "../../db/client";
import { eventos } from "../../db/schema";
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
  const lista = await db.select().from(eventos).orderBy(eventos.dataInicio);
  return new Response(JSON.stringify(lista), { headers: { "content-type": "application/json" } });
};

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Apenas o administrador pode criar eventos.", 403);

  const corpo = await request.json().catch(() => null) as {
    nome?: string;
    dataInicio?: string;
    dataFim?: string;
  } | null;

  if (!corpo?.nome?.trim() || !corpo?.dataInicio || !corpo?.dataFim) {
    return respostaErro("Nome, data de início e data de fim são obrigatórios.");
  }

  const db = getDb(env.DATABASE_URL);
  const [novoEvento] = await db
    .insert(eventos)
    .values({
      nome: corpo.nome.trim(),
      dataInicio: new Date(corpo.dataInicio),
      dataFim: new Date(corpo.dataFim),
      criadoPor: admin.id,
    })
    .returning();

  return new Response(JSON.stringify(novoEvento), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
