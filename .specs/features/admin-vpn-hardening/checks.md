# Admin só pela VPN + proteções do site público checks

Profile: light
Plan: `.specs/features/admin-vpn-hardening/plan.md`

29 checks in 4 slices · 5 one-way doors · 1 open, of which 0 block (1 blocks go-live)

## Checks

### S1 - Admin só pela tailnet e com Google · ~14 files · ~45 KB · ~12k

**C1** - `proxy` responde 404 em `/admin`, `/admin/login`, `/api/admin/items` e `/api/auth/session` quando o host difere de `ADMIN_HOST`, e deixa passar quando o host é igual (ADM-01, AC 1)
Proof: `npx vitest run tests/proxy.test.ts -t "host gate"`

**C2** - Com `ADMIN_HOST` indefinido, `proxy` responde 404 nas quatro rotas de admin (ADM-01, AC 2)
Proof: `npx vitest run tests/proxy.test.ts -t "ADMIN_HOST unset"`

**C3** - O layout protegido de `/admin` sem sessão redireciona para `/admin/login` (ADM-01, AC 3)
Proof: `npx vitest run tests/admin-layout.test.ts -t "redirects without session"`

**C4** - Sem sessão, cada uma das 6 operações de `/api/admin/*` responde 401 com `{ "error": "Não autorizado." }` (ADM-01, AC 4)
Proof: `npx vitest run tests/admin-routes.test.ts -t "401 without session"`

**C5** - O callback `signIn` aceita `FilipeMLins@gmail.com` com `ALLOWED_EMAILS=filipemlins@gmail.com`, recusa `outro@gmail.com`, e recusa todos com `ALLOWED_EMAILS` vazio (ADM-01, AC 5, AC 6)
Proof: `npx vitest run tests/auth.test.ts -t "signIn allowlist"`

**C6** - Com sessão, `POST /api/admin/items` cria um item (201) e `GET /api/admin/orders` lista pedidos (200) (ADM-01, AC 7)
Proof: `npx vitest run tests/admin-routes.test.ts -t "works with session"`

**C7** - No servidor real, `POST /api/items` → 405, `PATCH /api/items/<id>` → 405, `DELETE /api/items/<id>` → 405, `GET /api/orders` → 405, `GET /admin` com host público → 404, `GET /admin` com `ADMIN_HOST` sem cookie → 307 para `/admin/login` (ADM-01, AC 1, AC 3, AC 8)
Proof: `npm run build && node scripts/smoke.mjs routes`

**C17** - Com sessão, cada operação de admin cobre seu contrato: `POST /api/admin/items` 400 sem título; `PATCH /api/admin/items/<id>` 200 e 400 com `price: -1`; `DELETE /api/admin/items/<id>` 200; `PATCH /api/admin/orders/<id>` 200 e 400 com `status: "x"`; `POST /api/admin/upload` 400 com `text/plain`; cada rota com `[id]` responde 404 para id inexistente; cada uma das 6 responde 500 quando o store lança erro inesperado (ADM-01, AC 7)
Proof: `npx vitest run tests/admin-routes.test.ts -t "admin contract"`

**C18** - Auth.js montado: com `ADMIN_HOST`, `GET /api/auth/providers` → 200 listando `google`, e `POST /api/auth/signin/google` (com CSRF) → 302 para `accounts.google.com` (ADM-01, AC 5)
Proof: `npm run build && node scripts/smoke.mjs auth`

**C8** - Nenhum arquivo em `src/` contém `ADMIN_SECRET` nem `x-admin-secret` (ADM-01, AC 9)
Proof: `! grep -rnE "ADMIN_SECRET|x-admin-secret" src`

### S2 - Reserva pública protegida · ~4 files · ~15 KB · ~4k

**C9** - 5 `POST /api/orders` do mesmo `x-forwarded-for` passam do limite só no 6º, que recebe 429 com `{ "error": "Muitas tentativas. Tente de novo mais tarde." }` e `Retry-After` > 0; outro IP no mesmo instante não é bloqueado (PUB-01, AC 10)
Proof: `npx vitest run tests/orders-route.test.ts -t "rate limit"`

**C10** - Com uma reserva `pending` para `51999998888`, um 2º `createOrder` com o mesmo telefone lança `PHONE_HAS_PENDING` e a rota responde 409 com `{ "error": "Já existe uma reserva pendente para este telefone." }`; o número de pedidos não muda (PUB-01, AC 11)
Proof: `npx vitest run tests/store.test.ts -t "one pending per phone"`
Proof: `npx vitest run tests/orders-route.test.ts -t "phone pending 409"`

**C11** - Dois `createOrder` em `Promise.all` no mesmo item disponível: exatamente 1 resolve e 1 rejeita com `ITEM_UNAVAILABLE` (PUB-01, AC 12)
Proof: `npx vitest run tests/store.test.ts -t "concurrent reservation"`

**C19** - Rotas públicas: `GET /api/items/<id>` 200 para item existente e 404 para inexistente; `POST /api/orders` 201 válido, 400 sem nome, 404 item inexistente, 500 quando o store lança erro inesperado (PUB-01, AC 10)
Proof: `npx vitest run tests/orders-route.test.ts -t "public contract"`

**C12** - Depois de cancelar a reserva, ou de ela passar de 24h, o mesmo telefone reserva outro item com sucesso (PUB-01, AC 13)
Proof: `npx vitest run tests/store.test.ts -t "phone freed"`

### S3 - Dados que não se perdem · ~4 files · ~10 KB · ~3k

**C13** - Com `DATA_DIR=<tmp>`, `createItem` grava em `<tmp>/items.json`; 20 `createItem` em `Promise.all` deixam 20 itens no arquivo (DATA-01, AC 14, AC 16)
Proof: `npx vitest run tests/store.test.ts -t "DATA_DIR and write queue"`

**C14** - Se o `rename` da gravação falhar, `items.json` continua com o JSON anterior completo e parseável (DATA-01, AC 15)
Proof: `npx vitest run tests/store.test.ts -t "atomic write"`

**C15** - Upload com sessão grava em `UPLOADS_DIR` e devolve `/uploads/<nome>`; `GET /uploads/<nome>` → 200 `image/png`; nome fora do padrão (`..%2Fitems.json`, `x.svg`) → 404; nome válido inexistente → 404 (DATA-01, AC 17, AC 18, AC 19)
Proof: `npx vitest run tests/uploads.test.ts -t "upload and serve"`

### S4 - Pronto para a VPS · ~5 files · ~8 KB · ~2k

**C16** - `docker compose -f docker-compose.prod.yml config` sai 0 e publica `127.0.0.1:43127`; `caddy validate` aceita o `deploy/Caddyfile`; `docs/DEPLOY.md` cita as 8 variáveis, `tailscale serve` e o cron de backup com agendamento `0 * * * *` (OPS-01, AC 20, AC 21, AC 22)
Proof: `touch .env.production && docker compose -f docker-compose.prod.yml config | grep -A4 "host_ip: 127.0.0.1" | grep -q "published: \"43127\""`
Proof: `docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2 caddy validate --config /etc/caddy/Caddyfile`
Proof: `node scripts/check-deploy-doc.mjs`

### Review fixes (PR #1 findings A1, A2, A3, N1, P1)

**C20** - Duas instâncias do módulo do store (como o build de produção carrega para rotas e páginas) compartilham a fila: 20 `createItem` alternados entre elas deixam 20 itens (A1)
Proof: `npx vitest run tests/store.test.ts -t "shared queue"`

**C21** - Se a gravação do item falha depois do pedido salvo, `orders.json` volta sem o pedido e o item continua `available` (A2)
Proof: `npx vitest run tests/store.test.ts -t "order rollback"`

**C22** - Endereços IPv6 no mesmo /64 caem no mesmo contador; outro /64 não; IPv4 inalterado; janelas vencidas são removidas (A3)
Proof: `npx vitest run tests/rate-limit.test.ts`

**C23** - O JSON é gravado com `flush: true` (N1)
Proof: `npx vitest run tests/store.test.ts -t "durable write"`

**C24** - Confirmar um pedido que não está `pending` lança `INVALID_TRANSITION` (rota → 409) e não mexe no item (P1)
Proof: `npx vitest run tests/store.test.ts -t "order transitions"`

### Review fixes (PR #2 findings B1, A4, N2, N3, V1)

**C25** - Sem sessão, a página `/admin` redireciona antes de ler pedidos, e no servidor real o corpo do 307 não contém o telefone de um pedido sentinela (B1)
Proof: `npx vitest run tests/admin-page.test.ts -t "page guard"`
Proof: `npm run build && node scripts/smoke.mjs routes`

**C26** - Uma sessão cujo e-mail saiu de `ALLOWED_EMAILS` recebe 401 nas 6 operações de admin (A4)
Proof: `npx vitest run tests/admin-routes.test.ts -t "allowlist on every request"`

**C27** - Um 500 de admin registra o erro com `console.error` (N2)
Proof: `npx vitest run tests/admin-routes.test.ts -t "logs unexpected errors"`

**C28** - O login real (POST com CSRF em `/api/auth/signin/google`) responde 302 para `https://accounts.google.com/` (V1)
Proof: `npm run build && node scripts/smoke.mjs auth`

**C29** - `PATCH /api/admin/orders/<id>` confirmando um pedido cancelado responde 409 (P1 na rota)
Proof: `npx vitest run tests/admin-routes.test.ts -t "invalid order transition"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| rotas de admin bloqueadas por host (4) | `/admin` C1 · `/admin/*` C1 · `/api/admin/*` C1 · `/api/auth/*` C1 | - |
| operações `/api/admin/*` (6) | C4, table-driven over all 6 | - |
| `POST /api/orders` statuses (6) | 201 C19 · 400 C19 · 404 C19 · 409 C10 · 429 C9 · 500 C19 | - |
| `GET /api/orders` statuses (1) | 405 C7 | - |
| `GET /api/items` statuses (1) | 200 C7 | - |
| `POST /api/items` statuses (1) | 405 C7 | - |
| `GET /api/items/[id]` statuses (2) | 200 C19 · 404 C19 | - |
| `PATCH /api/items/[id]` statuses (1) | 405 C7 | - |
| `DELETE /api/items/[id]` statuses (1) | 405 C7 | - |
| `POST /api/admin/items` statuses (5) | 201 C6 · 400 C17 · 401 C4 · 404 C1 · 500 C17 | - |
| `PATCH /api/admin/items/[id]` statuses (5) | 200 C17 · 400 C17 · 401 C4 · 404 C17 · 500 C17 | - |
| `DELETE /api/admin/items/[id]` statuses (4) | 200 C17 · 401 C4 · 404 C17 · 500 C17 | - |
| `GET /api/admin/orders` statuses (4) | 200 C6 · 401 C4 · 404 C1 · 500 C17 | - |
| `PATCH /api/admin/orders/[id]` statuses (5) | 200 C17 · 400 C17 · 401 C4 · 404 C17 · 500 C17 | - |
| `PATCH /api/admin/orders/[id]` transição inválida (1) | 409 C24 C29 | - |
| `POST /api/admin/upload` statuses (5) | 201 C15 · 400 C17 · 401 C4 · 404 C1 · 500 C17 | - |
| `GET /uploads/[file]` statuses (2) | 200 C15 · 404 C15 | - |
| `GET,POST /api/auth/*` statuses (3) | 200 C18 · 302 C18 · 404 C1 | - |
| Landing doors (5) | auth C5 · gate por host C1 · rotas novas C4 C15 · topologia C16 · vitest C13 | - |
| startup config `ADMIN_HOST` (2 assemblies) | testes C1 · servidor real C7 | - |
| startup config `DATA_DIR` (2 assemblies) | testes C13 · compose C16 | - |

- Claims naming a status code, route or response shape: C4, C7, C9, C10, C15 - cada um cruza a fronteira do handler
- C7 e C18 são as provas no servidor real; cobrem o matcher do `proxy`, os 405 que o Next gera sozinho e o Auth.js montado
- 404 em rotas `[id]` de admin (id inexistente) é C17; 404 por host errado é C1

## Swept

- validation: C15 - nome de arquivo em `/uploads/`; demais validações de entrada já existem nas rotas
- failure modes: C14
- idempotency: C10 - 1 reserva pendente por telefone impede reserva repetida
- authorization: C1, C2, C4, C5
- concurrency: C11, C13
- data lifecycle: C12 - expiração de 24h libera o telefone; backup coberto por C16
- dependency failure: n/a because a única dependência externa é o Google no login; se cair, só o admin fica sem login e o site público segue
- state transitions: C12
- observability: n/a because o requisito é só o log padrão do Next em stdout, lido via `docker compose logs`

## Handoff

Intended split, with the arithmetic, written before any code:

- S1-S4 ≈ 21k tokens de leitura (wc -c ≈ 40 KB nos arquivos tocados + ~40 KB novos ÷ 4), bem abaixo de 150k -> um builder só, sem handoff
