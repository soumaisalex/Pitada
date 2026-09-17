import express from "express";
import { criarCobranca, consultarCobranca, testarAutenticacao, configurarWebhook } from "./lib/efiClient.js";

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.path}`);
  next();
});

// Middleware simples de autenticação — só as Pages Functions do nosso próprio
// sistema devem conseguir chamar este serviço, nunca deve ficar exposto publicamente.
app.use((req, res, next) => {
  const segredoRecebido = req.header("X-Internal-Secret");
  if (segredoRecebido !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ erro: "Não autorizado." });
  }
  next();
});

app.get("/saude", (_req, res) => res.json({ ok: true }));

app.get("/testar-autenticacao", async (_req, res) => {
  try {
    const resultado = await testarAutenticacao();
    res.json(resultado);
  } catch (erro) {
    res.status(500).json({ ok: false, erro: erro.message });
  }
});

app.post("/cobrancas", async (req, res) => {
  try {
    const { valor, descricao } = req.body;
    if (!valor) {
      return res.status(400).json({ erro: "Informe o valor." });
    }
    const cobranca = await criarCobranca({ valor, descricao });
    res.status(201).json(cobranca);
  } catch (erro) {
    res.status(502).json({ erro: erro.message });
  }
});

app.get("/cobrancas/:txid", async (req, res) => {
  try {
    const cobranca = await consultarCobranca(req.params.txid);
    res.json(cobranca);
  } catch (erro) {
    res.status(502).json({ erro: erro.message });
  }
});

// Uso único (ou sempre que a URL do webhook mudar) — configura no Efí para
// onde ele deve notificar quando um Pix cair na nossa chave.
app.post("/webhook/configurar", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ erro: "Informe a url." });
    const resultado = await configurarWebhook(url);
    res.json(resultado);
  } catch (erro) {
    console.error("[erro] /webhook/configurar:", erro);
    res.status(502).json({ erro: erro.message });
  }
});

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`efi-proxy rodando na porta ${porta}`));
