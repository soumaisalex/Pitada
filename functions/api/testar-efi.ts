// Rota TEMPORÁRIA de diagnóstico — confirma que o binding mTLS funciona nas Pages
// Functions antes de construirmos a integração completa (Fase 3). Remover depois.
import { obterAdminAtual, type EnvAuth } from "../_lib/auth";

interface Env extends EnvAuth {
  MTLS_EFI_HOMOLOGACAO: Fetcher;
  EFI_CLIENT_ID: string;
  EFI_CLIENT_SECRET: string;
}

const URL_BASE_HOMOLOGACAO = "https://pix-h.api.efipay.com.br";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ erro: "Acesso restrito ao administrador." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const credenciais = btoa(`${env.EFI_CLIENT_ID}:${env.EFI_CLIENT_SECRET}`);

  try {
    const resposta = await env.MTLS_EFI_HOMOLOGACAO.fetch(`${URL_BASE_HOMOLOGACAO}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credenciais}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
    });

    const corpo = await resposta.text();

    return new Response(
      JSON.stringify({
        ok: resposta.ok,
        status: resposta.status,
        corpo: corpo.slice(0, 500), // limitado, é só diagnóstico
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({
        ok: false,
        erroConexao: erro instanceof Error ? erro.message : String(erro),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
