import { SignJWT, jwtVerify } from "jose";

const ALGORITMO = "HS256";

export async function criarTokenSessao(usuarioId: string, segredo: string): Promise<string> {
  const chave = new TextEncoder().encode(segredo);
  return new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: ALGORITMO })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(chave);
}

export async function verificarTokenSessao(token: string, segredo: string): Promise<string | null> {
  try {
    const chave = new TextEncoder().encode(segredo);
    const { payload } = await jwtVerify(token, chave);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
