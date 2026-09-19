import { getDb } from "../../../db/client";
import { usuarios } from "../../../db/schema";
import { obterAdminAtual, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) return respostaErro("Acesso restrito ao administrador.", 403);

  const url = new URL(request.url);
  const papel = url.searchParams.get("papel") ?? "todos";

  const db = getDb(env.DATABASE_URL);
  let lista = await db.select().from(usuarios);

  if (papel === "lojista") lista = lista.filter((u) => u.isLojista);
  else if (papel === "admin") lista = lista.filter((u) => u.isAdmin);
  else if (papel === "cliente") lista = lista.filter((u) => !u.isLojista);

  const semSenha = lista.map(({ senhaHash: _senhaHash, ...resto }) => resto);

  return new Response(JSON.stringify(semSenha), {
    headers: { "content-type": "application/json" },
  });
};
