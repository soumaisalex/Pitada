import { Agent, request as undiciRequest } from "undici";

const URL_BASE = process.env.EFI_BASE_URL; // ex: https://pix-h.api.efipay.com.br (homologação)

let agenteMtls = null;
function obterAgente() {
  if (!agenteMtls) {
    agenteMtls = new Agent({
      connect: {
        cert: process.env.EFI_CERT_PEM,
        key: process.env.EFI_KEY_PEM,
      },
    });
  }
  return agenteMtls;
}

let tokenCache = { valor: null, expiraEm: 0 };

async function obterAccessToken() {
  const agora = Date.now();
  if (tokenCache.valor && agora < tokenCache.expiraEm) {
    return tokenCache.valor;
  }

  const credenciais = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
  ).toString("base64");

  const resposta = await undiciRequest(`${URL_BASE}/oauth/token`, {
    method: "POST",
    dispatcher: obterAgente(),
    headers: {
      Authorization: `Basic ${credenciais}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  const dados = await resposta.body.json();

  if (resposta.statusCode !== 200) {
    throw new Error(`Falha ao autenticar no Efí (status ${resposta.statusCode}): ${JSON.stringify(dados)}`);
  }

  tokenCache = {
    valor: dados.access_token,
    // Renova 60s antes de expirar, por segurança
    expiraEm: agora + (dados.expires_in - 60) * 1000,
  };

  return tokenCache.valor;
}

async function chamarEfi(caminho, opcoes = {}) {
  const token = await obterAccessToken();

  const resposta = await undiciRequest(`${URL_BASE}${caminho}`, {
    ...opcoes,
    dispatcher: obterAgente(),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });

  const dados = await resposta.body.json();
  return { status: resposta.statusCode, dados };
}

export async function criarCobranca({ valor, chavePixRecebedor, descricao }) {
  const { status, dados } = await chamarEfi("/v2/cob", {
    method: "POST",
    body: JSON.stringify({
      calendario: { expiracao: 3600 },
      valor: { original: Number(valor).toFixed(2) },
      chave: chavePixRecebedor,
      solicitacaoPagador: descricao?.slice(0, 140) || "Crédito de Pitadas",
    }),
  });

  if (status !== 201) {
    throw new Error(`Falha ao criar cobrança (status ${status}): ${JSON.stringify(dados)}`);
  }

  // Busca o QR Code / copia-e-cola a partir do loc.id retornado
  const { dados: dadosQr } = await chamarEfi(`/v2/loc/${dados.loc.id}/qrcode`);

  return {
    txid: dados.txid,
    status: dados.status,
    copiaECola: dadosQr.qrcode,
    imagemQrCodeBase64: dadosQr.imagemQrcode,
  };
}

export async function consultarCobranca(txid) {
  const { status, dados } = await chamarEfi(`/v2/cob/${txid}`);
  if (status !== 200) {
    throw new Error(`Falha ao consultar cobrança (status ${status}): ${JSON.stringify(dados)}`);
  }
  return dados;
}

export async function testarAutenticacao() {
  await obterAccessToken();
  return { ok: true };
}
