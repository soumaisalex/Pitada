const URL_BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(opcoes.headers || {}) },
    ...opcoes,
  });

  const dados = await resposta.json().catch(() => null) as (T & { erro?: string }) | null;

  if (!resposta.ok) {
    throw new ApiError(dados?.erro || "Ocorreu um erro inesperado.", resposta.status);
  }

  return dados as T;
}
