# efi-proxy

Serviço pequeno e independente cuja única função é falar com a API do Efí (Pix)
usando o certificado mTLS — algo que o Cloudflare Pages não consegue fazer quando
o destino (o próprio Efí) também está atrás do Cloudflare. Roda no Render, fora
da rede do Cloudflare, e é chamado pelas Pages Functions do site principal por
HTTPS comum, autenticado por um segredo compartilhado.

## Publicar no Render

1. Crie uma conta em render.com (se ainda não tiver)
2. **New → Web Service** → conecte este repositório GitHub
3. Em **Root Directory**, aponte para `efi-proxy` (é um subdiretório do
   repositório principal, não a raiz)
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Em **Environment**, cadastre as variáveis listadas em `.env.example`:
   - `INTERNAL_SECRET` — gere um valor aleatório forte (peça pra mim se quiser)
   - `EFI_BASE_URL` — `https://pix-h.api.efipay.com.br` (homologação)
   - `EFI_CLIENT_ID` / `EFI_CLIENT_SECRET` — da aplicação Efí de homologação
   - `EFI_CERT_PEM` / `EFI_KEY_PEM` — conteúdo dos arquivos extraídos do `.p12`
7. Deploy. O Render te dá uma URL tipo `https://efi-proxy-xxxx.onrender.com`

## Testar

```bash
curl https://SEU-SERVICO.onrender.com/testar-autenticacao \
  -H "X-Internal-Secret: SEU_INTERNAL_SECRET"
```

Resposta esperada: `{"ok":true}`. Se dor erro, a mensagem já indica se é
problema de certificado, credenciais ou outra coisa.

## Rotas

- `GET /saude` — verificação simples, sem chamar o Efí
- `GET /testar-autenticacao` — tenta obter um access_token do Efí
- `POST /cobrancas` — cria uma cobrança Pix imediata `{ valor, chavePixRecebedor, descricao }`
- `GET /cobrancas/:txid` — consulta o status de uma cobrança

Todas as rotas exigem o cabeçalho `X-Internal-Secret` com o valor configurado
em `INTERNAL_SECRET`.

## Sobre o plano gratuito do Render

O serviço "dorme" depois de 15 minutos sem uso e demora ~30-60s pra acordar na
próxima chamada. Está OK para os testes de homologação agora, mas antes de ir
para produção de verdade, vale migrar esse serviço específico para o plano
pago (a partir de ~$7/mês) — um webhook do Efí chegando bem na hora que o
serviço está dormindo pode ser perdido.
