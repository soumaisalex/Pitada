import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { gerarCodigo } from "../_lib/codigo";

interface Env extends EnvAuth {
  BUCKET_IMAGENS: R2Bucket;
}

const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const formData = await request.formData().catch(() => null);
  const arquivo = formData?.get("arquivo");

  if (!(arquivo instanceof File)) {
    return respostaErro("Envie o arquivo no campo 'arquivo'.");
  }

  const extensao = TIPOS_PERMITIDOS[arquivo.type];
  if (!extensao) {
    return respostaErro("Formato inválido. Envie uma imagem JPEG, PNG ou WebP.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return respostaErro("A imagem precisa ter até 5MB.");
  }

  const chave = `${usuario.id}/${gerarCodigo(10)}.${extensao}`;

  await env.BUCKET_IMAGENS.put(chave, await arquivo.arrayBuffer(), {
    httpMetadata: { contentType: arquivo.type },
  });

  return new Response(JSON.stringify({ url: `/api/imagens/${chave}` }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
