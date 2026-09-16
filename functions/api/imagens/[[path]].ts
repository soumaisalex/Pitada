interface Env {
  BUCKET_IMAGENS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const segmentos = params.path as string[] | undefined;
  if (!segmentos || segmentos.length === 0) {
    return new Response("Não encontrado.", { status: 404 });
  }

  const chave = segmentos.join("/");
  const objeto = await env.BUCKET_IMAGENS.get(chave);

  if (!objeto) {
    return new Response("Imagem não encontrada.", { status: 404 });
  }

  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
