// Rota TEMPORÁRIA de configuração — registra a URL de webhook no Efí.
// Use uma vez (ou sempre que a URL do site mudar) e pode remover depois.
import { obterAdminAtual, type EnvAuth } from "../../_lib/auth";

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

  // Monta a própria URL do webhook a partir do host da requisição atual —
  // assim funciona tanto no domínio de produção quanto num preview do Cloudflare.
  const urlWebhook = `${new URL(request.url).origin}/api/webhooks/efi`;

  try {
    const resposta = await fetch(`${env.EFI_PROXY_URL}/webhook/configurar`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Internal-Secret": env.EFI_PROXY_SECRET,
      },
      body: JSON.stringify({ url: urlWebhook }),
    });
    const corpo = await resposta.text();

    return new Response(
      JSON.stringify({ ok: resposta.ok, urlConfigurada: urlWebhook, status: resposta.status, corpo }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
