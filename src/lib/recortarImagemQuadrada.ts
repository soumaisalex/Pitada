export async function recortarImagemQuadrada(arquivo: File, tamanhoMaximo = 800): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);

  const lado = Math.min(bitmap.width, bitmap.height);
  const origemX = (bitmap.width - lado) / 2;
  const origemY = (bitmap.height - lado) / 2;

  const tamanhoFinal = Math.min(lado, tamanhoMaximo);
  const canvas = document.createElement("canvas");
  canvas.width = tamanhoFinal;
  canvas.height = tamanhoFinal;

  const contexto = canvas.getContext("2d");
  if (!contexto) return arquivo; // fallback — não deveria acontecer num navegador normal

  contexto.drawImage(bitmap, origemX, origemY, lado, lado, 0, 0, tamanhoFinal, tamanhoFinal);

  const tipo = arquivo.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, tipo, 0.9));

  if (!blob) return arquivo; // fallback

  const nomeBase = arquivo.name.replace(/\.[^.]+$/, "");
  const extensao = tipo === "image/png" ? "png" : "jpg";
  return new File([blob], `${nomeBase}.${extensao}`, { type: tipo });
}
