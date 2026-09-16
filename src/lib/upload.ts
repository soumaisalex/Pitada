import { ApiError } from "../context/AuthContext";

export async function enviarImagem(arquivo: File): Promise<string> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const resposta = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const dados = await resposta.json().catch(() => null) as { url?: string; erro?: string } | null;

  if (!resposta.ok || !dados?.url) {
    throw new ApiError(dados?.erro || "Não foi possível enviar a imagem.", resposta.status);
  }

  return dados.url;
}
