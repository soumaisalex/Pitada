import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { transacoes } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { gerarCodigoComPrefixo } from "../_lib/codigo";
import { obterConfiguracaoNumerica } from "../_lib/configuracoes";

interface Env extends EnvAuth {
  EFI_PROXY_URL: string;
  EFI_PROXY_SECRET: string;
}

function respostaErro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const usuario = await obterUsuarioAtual(request, env);
  if (!usuario) return respostaErro("Não autenticado.", 401);

  const corpo = await request.json().catch(() => null) as { valor?: number } | null;
  const valorDesejado = Number(corpo?.valor);
  if (!valorDesejado || valorDesejado <= 0) {
    return respostaErro("Informe um valor válido.");
  }

  const taxaPercentual = await obterConfiguracaoNumerica(env.DATABASE_URL, "taxa_recebimento_pix_percentual", 1.19);
  const taxa = Math.round(valorDesejado * (taxaPercentual / 100) * 100) / 100;
  const valorTotalCobranca = valorDesejado + taxa;

  let cobranca: { txid: string; copiaECola: string; imagemQrCodeBase64: string };
  try {
    const resposta = await fetch(`${env.EFI_PROXY_URL}/cobrancas`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Internal-Secret": env.EFI_PROXY_SECRET,
      },
      body: JSON.stringify({
        valor: valorTotalCobranca,
        descricao: `Crédito de ${valorDesejado} Pitadas`,
      }),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(detalhe);
    }
    cobranca = await resposta.json();
  } catch (erro) {
    return respostaErro(
      `Não foi possível gerar a cobrança Pix agora. Detalhe: ${erro instanceof Error ? erro.message : String(erro)}`,
      502
    );
  }

  const db = getDb(env.DATABASE_URL);

  let codigo = gerarCodigoComPrefixo("T");
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    const [conflito] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
    if (!conflito) break;
    codigo = gerarCodigoComPrefixo("T");
  }

  const [novaTransacao] = await db
    .insert(transacoes)
    .values({
      codigo,
      tipo: "credito_pix",
      usuarioDestinoId: usuario.id,
      valor: String(valorDesejado),
      taxaPix: String(taxa),
      txidEfi: cobranca.txid,
      status: "pendente",
    })
    .returning();

  return new Response(
    JSON.stringify({
      id: novaTransacao.id,
      codigo: novaTransacao.codigo,
      valor: valorDesejado,
      taxa,
      valorTotalCobranca,
      copiaECola: cobranca.copiaECola,
      imagemQrCodeBase64: cobranca.imagemQrCodeBase64,
    }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
};
