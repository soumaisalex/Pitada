import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { usuarios } from "../../../db/schema";
import { verificarSenha } from "../../_lib/senha";
import { criarTokenSessao } from "../../_lib/jwt";
import { criarCookieSessao, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const corpo = await request.json().catch(() => null) as { email?: string; senha?: string } | null;
  if (!corpo?.email || !corpo?.senha) {
    return respostaErro("E-mail e senha são obrigatórios.");
  }

  const db = getDb(env.DATABASE_URL);
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, corpo.email.trim().toLowerCase()))
    .limit(1);

  // Mensagem genérica de propósito — não revelar se o e-mail existe ou não.
  if (!usuario) {
    return respostaErro("E-mail ou senha incorretos.", 401);
  }
  if (usuario.status === "suspenso") {
    return respostaErro("Esta conta está suspensa. Fale com o administrador.", 403);
  }

  const senhaCorreta = await verificarSenha(corpo.senha, usuario.senhaHash);
  if (!senhaCorreta) {
    return respostaErro("E-mail ou senha incorretos.", 401);
  }

  const token = await criarTokenSessao(usuario.id, env.JWT_SECRET);

  return new Response(
    JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      primeiroNome: usuario.primeiroNome,
      email: usuario.email,
      telefone: usuario.telefone,
      chavePix: usuario.chavePix,
      isLojista: usuario.isLojista,
      saldoPitadas: usuario.saldoPitadas,
    }),
    {
      headers: {
        "content-type": "application/json",
        "Set-Cookie": criarCookieSessao(token),
      },
    }
  );
};
