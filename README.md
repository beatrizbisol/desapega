# Beatriz & Filipe — Voltando pra Fortaleza

Site para anunciar e vender itens da mudança de Porto Alegre para Fortaleza.
Cada item tem estoque de **1 unidade**, com fotos, descrição e fluxo de compra
(Pix ou cartão — front pronto; integração de pagamento depois).

## Como rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://127.0.0.1:43127](http://127.0.0.1:43127).

Variável importante: `ADMIN_SECRET` (senha de `/admin`).

## Cadastro de itens

1. Acesse `/admin`
2. Entre com a senha de `ADMIN_SECRET`
3. Envie fotos, título, descrição e valor
4. Publique — o item aparece na vitrine

Pedidos/reservas também aparecem em `/admin`. Reservas pendentes expiram em 24h.

## Publicar no GitHub + deixar o site no ar (Vercel)

### 1. Repositório público no GitHub

1. No Cursor, use **Create repo** para criar o repositório GitHub público deste projeto.
2. Confirme que o remoto aponta para `github.com/<sua-conta>/<nome-do-repo>`.
3. Em **Settings → Collaborators**, convide o Filipe pelo **username do GitHub** dele (permissão *Write* ou *Admin*).

### 2. Deploy na Vercel (pode ser a conta do Filipe)

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub.
2. **Add New Project** → importe o repositório público.
3. Framework: Next.js (detecta sozinho).
4. Em **Environment Variables**, defina:
   - `ADMIN_SECRET` = senha escolhida para `/admin`
5. Deploy. O site fica em `https://<projeto>.vercel.app` (dá para ligar domínio depois).

Qualquer push em `main` gera um novo deploy automático.

### Atenção sobre dados em produção

Hoje itens/pedidos ficam em `data/*.json` no disco. Na Vercel o disco **não persiste** entre deploys/requisições — a vitrine com os itens já commitados funciona, mas cadastro/pedidos em `/admin` precisam de armazenamento externo (ex.: Upstash Redis ou banco). Quando o repo GitHub estiver criado, dá para plugar isso antes ou logo após o primeiro deploy.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
