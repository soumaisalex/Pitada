import { verificarTokenSessao } from "./jwt";
import { getDb } from "../../db/client";
import { usuarios } from "../../db/schema";
import { eq } from "drizzle-orm";

const NOME_COOKIE = "sessao";
const TRINTA_DIAS_SEGUNDOS = 60 * 60 * 24 * 30;

export interface EnvAuth {
  DATABASE_URL: string;
  JWT_SECRET: string;
}

export function lerCookie(request: Request, nome: string): string | null {
  const cabecalho = request.headers.get("Cookie") || "";
  const correspondencia = cabecalho.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]*)`));
  return correspondencia ? decodeURIComponent(correspondencia[1]) : null;
}

export function criarCookieSessao(token: string): string {
  return `${NOME_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TRINTA_DIAS_SEGUNDOS}`;
}

export function limparCookieSessao(): string {
  return `${NOME_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function obterUsuarioAtual(request: Request, env: EnvAuth) {
  const token = lerCookie(request, NOME_COOKIE);
  if (!token) return null;

  const usuarioId = await verificarTokenSessao(token, env.JWT_SECRET);
  if (!usuarioId) return null;

  const db = getDb(env.DATABASE_URL);
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  return usuario ?? null;
}
