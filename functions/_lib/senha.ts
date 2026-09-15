// Hash de senha via PBKDF2 (Web Crypto API), nativo do runtime do Cloudflare Workers.
// Evitamos bcrypt/argon2 aqui porque dependem de bindings nativos que não rodam em Workers.

const ITERACOES = 100_000;
const ALGORITMO_HASH = "SHA-256";
const TAMANHO_CHAVE_BITS = 256;

function paraBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = "";
  for (const b of arr) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERACOES, hash: ALGORITMO_HASH },
    chave,
    TAMANHO_CHAVE_BITS
  );
  return `pbkdf2:${ITERACOES}:${paraBase64(salt)}:${paraBase64(bits)}`;
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const partes = hashArmazenado.split(":");
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;
  const [, iteracoesStr, saltB64, hashB64] = partes;

  const salt = deBase64(saltB64);
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: parseInt(iteracoesStr, 10), hash: ALGORITMO_HASH },
    chave,
    TAMANHO_CHAVE_BITS
  );

  return paraBase64(bits) === hashB64;
}
