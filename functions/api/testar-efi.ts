// Rota TEMPORÁRIA de diagnóstico — confirma que o proxy no Render está no ar
// e consegue autenticar no Efí. Remover depois que a Fase 3 estiver completa.
import { obterAdminAtual, type EnvAuth } from "../_lib/auth";

interface Env extends EnvAuth {
  EFI_PROXY_URL: string;
  EFI_PROXY_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await obterAdminAtual(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ erro: "Acesso restrito ao administrador." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const resposta = await fetch(`${env.EFI_PROXY_URL}/testar-autenticacao`, {
      headers: { "X-Internal-Secret": env.EFI_PROXY_SECRET },
    });
    const corpo = await resposta.text();

    return new Response(
      JSON.stringify({ ok: resposta.ok, status: resposta.status, corpo: corpo.slice(0, 500) }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({ ok: false, erroConexao: erro instanceof Error ? erro.message : String(erro) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
