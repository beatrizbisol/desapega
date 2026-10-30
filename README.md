# Beatriz & Filipe — Voltando pra Fortaleza

Site para anunciar e vender itens da mudança de Porto Alegre para Fortaleza.
Cada item tem estoque de **1 unidade**, com fotos, descrição e fluxo de compra
(Pix ou cartão — front pronto; integração de pagamento depois).

## Como rodar

```bash
npm install
cp .env.example .env.local   # se ainda não tiver
npm run dev
```

Abra [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Cadastro de itens

1. Acesse `/admin`
2. Entre com a senha de `ADMIN_SECRET` (padrão local: `mudanca2026`)
3. Envie fotos, título, descrição e valor
4. Publique — o item aparece na vitrine

Pedidos/reservas também aparecem em `/admin`.

## Fluxo de compra

Na página do item, **Comprar** → nome e contato → Pix ou cartão → reserva o
item (`status: reserved`). O pagamento real ainda não está integrado; o front
já deixa o caminho pronto.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui. Dados em
`data/*.json` e fotos em `public/uploads/` (sem banco por enquanto).
