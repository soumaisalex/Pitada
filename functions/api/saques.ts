import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { transacoes, usuarios } from "../../db/schema";
import { obterUsuarioAtual, type EnvAuth } from "../_lib/auth";
import { verificarSenha } from "../_lib/senha";
import { gerarCodigo, gerarCodigoComPrefixo } from "../_lib/codigo";
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

  if (!usuario.chavePix) {
    return respostaErro("Cadastre uma chave Pix no seu perfil antes de sacar.");
  }

  const corpo = await request.json().catch(() => null) as { valor?: number; senhaAtual?: string } | null;
  const valorSolicitado = Number(corpo?.valor);
  if (!valorSolicitado || valorSolicitado <= 0) {
    return respostaErro("Informe um valor válido.");
  }
  if (!corpo?.senhaAtual) {
    return respostaErro("Confirme sua senha para sacar.");
  }

  const senhaCorreta = await verificarSenha(corpo.senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) {
    return respostaErro("Senha incorreta.", 401);
  }

  const taxaPercentual = await obterConfiguracaoNumerica(env.DATABASE_URL, "taxa_saque_pix_percentual", 0);
  const taxa = Math.round(valorSolicitado * (taxaPercentual / 100) * 100) / 100;
  const valorTotalDebito = valorSolicitado + taxa;

  const db = getDb(env.DATABASE_URL);

  // Debita de forma atômica: só passa se o saldo no banco, no momento exato
  // do update, ainda cobrir o valor — evita saldo negativo em pedidos simultâneos.
  const [usuarioAtualizado] = await db
    .update(usuarios)
    .set({ saldoPitadas: sql`${usuarios.saldoPitadas} - ${valorTotalDebito}` })
    .where(and(eq(usuarios.id, usuario.id), sql`${usuarios.saldoPitadas} >= ${valorTotalDebito}`))
    .returning();

  if (!usuarioAtualizado) {
    return respostaErro("Saldo insuficiente.");
  }

  const idEnvio = gerarCodigo(32);

  try {
    const resposta = await fetch(`${env.EFI_PROXY_URL}/envios`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Internal-Secret": env.EFI_PROXY_SECRET,
      },
      body: JSON.stringify({
        valor: valorSolicitado,
        chaveDestino: usuario.chavePix,
        idEnvio,
        infoPagador: "Saque de Pitadas",
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(detalhe);
    }
  } catch (erro) {
    // Reembolsa — o débito já tinha sido feito, mas o envio falhou.
    await db
      .update(usuarios)
      .set({ saldoPitadas: sql`${usuarios.saldoPitadas} + ${valorTotalDebito}` })
      .where(eq(usuarios.id, usuario.id));

    return respostaErro(
      `Não foi possível processar o saque agora. Seu saldo foi estornado. Detalhe: ${erro instanceof Error ? erro.message : String(erro)}`,
      502
    );
  }

  let codigo = gerarCodigoComPrefixo("S");
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    const [conflito] = await db.select().from(transacoes).where(eq(transacoes.codigo, codigo)).limit(1);
    if (!conflito) break;
    codigo = gerarCodigoComPrefixo("S");
  }

  const [novaTransacao] = await db
    .insert(transacoes)
    .values({
      codigo,
      tipo: "saque",
      usuarioOrigemId: usuario.id,
      valor: String(valorSolicitado),
      taxaPix: String(taxa),
      txidEfi: idEnvio,
      status: "pendente",
    })
    .returning();

  return new Response(JSON.stringify({ id: novaTransacao.id, codigo: novaTransacao.codigo }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
