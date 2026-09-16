import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { usuarios } from "../../../db/schema";
import { hashSenha } from "../../_lib/senha";
import { criarTokenSessao } from "../../_lib/jwt";
import { criarCookieSessao, type EnvAuth } from "../../_lib/auth";

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<EnvAuth> = async ({ request, env }) => {
  const corpo = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!corpo) return respostaErro("Corpo da requisição inválido.");

  const { nome, primeiroNome, email, senha, telefone, chavePix, isLojista } = corpo as {
    nome?: string;
    primeiroNome?: string;
    email?: string;
    senha?: string;
    telefone?: string;
    chavePix?: string;
    isLojista?: boolean;
  };

  if (!nome?.trim() || !primeiroNome?.trim() || !email?.trim() || !senha) {
    return respostaErro("Nome, primeiro nome, e-mail e senha são obrigatórios.");
  }
  if (senha.length < 8) {
    return respostaErro("A senha precisa ter pelo menos 8 caracteres.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respostaErro("E-mail inválido.");
  }

  const db = getDb(env.DATABASE_URL);

  const existente = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
  if (existente.length > 0) {
    return respostaErro("Este e-mail já está cadastrado.");
  }

  const senhaHash = await hashSenha(senha);

  const [novoUsuario] = await db
    .insert(usuarios)
    .values({
      nome: nome.trim(),
      primeiroNome: primeiroNome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash,
      telefone: telefone?.trim() || null,
      chavePix: chavePix?.trim() || null,
      isLojista: Boolean(isLojista),
    })
    .returning();

  const token = await criarTokenSessao(novoUsuario.id, env.JWT_SECRET);

  return new Response(
    JSON.stringify({
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      primeiroNome: novoUsuario.primeiroNome,
      email: novoUsuario.email,
      telefone: novoUsuario.telefone,
      chavePix: novoUsuario.chavePix,
      isLojista: novoUsuario.isLojista,
      isAdmin: novoUsuario.isAdmin,
      saldoPitadas: novoUsuario.saldoPitadas,
    }),
    {
      status: 201,
      headers: {
        "content-type": "application/json",
        "Set-Cookie": criarCookieSessao(token),
      },
    }
  );
};
