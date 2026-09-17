# Pitada

Sistema de gestão da feirinha gastronômica do condomínio, com moeda virtual própria (a Pitada).

## Stack
React + Vite · Cloudflare Pages (Functions como API) · Neon (PostgreSQL) · Drizzle ORM · Efí (PSP de pagamentos Pix)

## Fase 0 — Passo a passo (feito uma vez, manualmente, nas suas contas)

1. **Repositório GitHub**
   - Crie o repositório (ex: `pitada`) na sua conta
   - Suba este scaffold: `git remote add origin <url>` e `git push -u origin main`
   - Proteja a branch `main`: exigir Pull Request antes de mesclar (Settings → Branches)

2. **Banco de dados no Neon**
   - Crie um novo projeto no Neon
   - Crie dois **branches** de banco: um para desenvolvimento e outro para produção (recurso nativo do Neon — evita usar o mesmo banco pros dois ambientes)
   - Copie a `DATABASE_URL` de cada branch

3. **Projeto no Cloudflare Pages**
   - Crie um novo projeto conectado a este repositório GitHub
   - Configure o *build command* (`npm run build`) e o *output directory* (`dist`)
   - Em Settings → Environment variables, cadastre `DATABASE_URL` como **Secret**, separadamente para os ambientes **Preview** e **Production** (usando a branch de dev do Neon no Preview e a de produção no Production)
   - Deploys de Pull Request caem automaticamente no ambiente de Preview — é aí que qualquer mudança deve ser validada antes de ir para produção

4. **Instalar dependências e rodar localmente**
   ```bash
   npm install
   cp .env.example .env   # preencha com a DATABASE_URL de desenvolvimento
   npm run dev
   ```

5. **Gerar e aplicar a primeira migration**
   ```bash
   npm run db:generate   # cria os arquivos de migration a partir de db/schema.ts
   npm run db:migrate    # aplica no banco apontado por DATABASE_URL
   ```

6. **Confirmar que a Function de exemplo responde**
   ```bash
   npm run pages:dev
   # depois, em outra aba: curl http://localhost:8788/api/status
   # deve retornar {"ok":true}
   ```

## Estrutura de pastas
```
src/            → frontend React (Vite)
functions/api/  → backend — cada arquivo aqui é uma rota de API (Cloudflare Pages Functions)
db/schema.ts    → modelo de dados completo (Drizzle ORM)
db/migrations/  → histórico de migrations geradas
```

## Próximos passos
Depois da Fase 0 validada (repositório, Cloudflare Pages e Neon conectados, migration inicial aplicada, `/api/status` respondendo), seguimos para a **Fase 1 — Autenticação e usuários**.
