# Deploy na VPS

Mesma VPS do harmonica-analytics (tailnet `tail4f62e1.ts.net`).

| Quem | Endereço | Caminho |
|---|---|---|
| Público (vitrine e reserva) | `https://desapega.useclubapp.com` | Cloudflare → Cloudflare Tunnel (`cloudflared` no compose) → `web:43127` |
| Admin (só na tailnet) | `https://harmonica-analytics.tail4f62e1.ts.net:8443/admin` | `tailscale serve` → `127.0.0.1:43127` |

O app escuta só em `127.0.0.1` e nenhuma porta pública é aberta: as portas 80/443 da VPS já são do Caddy do harmonica-api e o firewall só aceita a Cloudflare nelas. Uma regra WAF da Cloudflare bloqueia `/admin`, `/api/admin` e `/api/auth` no domínio público, e o próprio app (`src/proxy.ts`) também dá 404 nessas rotas para qualquer host diferente de `ADMIN_HOST`.

## 1. Túnel e DNS (Cloudflare da Beatriz)

Em Zero Trust → Networks → Tunnels, crie o túnel `desapega` (tipo Cloudflared) e copie o token. Em "Public hostname", adicione `desapega.useclubapp.com` → `HTTP` → `web:43127`; isso cria o CNAME da zona apontando para o túnel (apague antes qualquer registro `A` com esse nome).

Em Security → WAF → Custom rules da zona `useclubapp.com`, crie a regra "desapega admin" com ação **Block**:

```
(http.host eq "desapega.useclubapp.com" and (starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/api/admin") or starts_with(http.request.uri.path, "/api/auth")))
```

## 2. Google OAuth

No Google Cloud Console, crie um client OAuth do tipo "Web application" só para o desapega:

- Authorized redirect URI: `https://harmonica-analytics.tail4f62e1.ts.net:8443/api/auth/callback/google`

Guarde o client ID e o secret para o passo 4.

## 3. Dados

```bash
sudo mkdir -p /var/lib/desapega/uploads
sudo cp data/items.json /var/lib/desapega/items.json   # catálogo inicial, só na primeira vez
echo '[]' | sudo tee /var/lib/desapega/orders.json
sudo chown -R 1000:1000 /var/lib/desapega              # usuário `node` do container
```

## 4. Variáveis (`.env.production`, fora do git)

| Variável | Valor |
|---|---|
| `ADMIN_HOST` | `harmonica-analytics.tail4f62e1.ts.net:8443` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://harmonica-analytics.tail4f62e1.ts.net:8443` |
| `AUTH_GOOGLE_ID` | client ID do passo 2 |
| `AUTH_GOOGLE_SECRET` | client secret do passo 2 |
| `ALLOWED_EMAILS` | `filipemlins@gmail.com,beatrizbisol@gmail.com` |
| `TUNNEL_TOKEN` | token do túnel do passo 1 (lido pelo serviço `tunnel`) |
| `CLIENT_IP_HEADER` | `cf-connecting-ip` (já definido no compose) |
| `DATA_DIR` | `/data` (já definido no compose) |
| `UPLOADS_DIR` | `/data/uploads` (já definido no compose) |

## 5. App

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:43127/api/items   # 200
```

## 6. Admin pela tailnet

```bash
sudo tailscale serve --bg --https=8443 http://127.0.0.1:43127
tailscale serve status
```

Não ligue o Funnel nessa porta: sem Funnel, a 8443 só existe dentro da tailnet.

## 7. Backup de hora em hora

```bash
sudo cp deploy/backup.sh /usr/local/bin/desapega-backup
echo '0 * * * * root /usr/local/bin/desapega-backup' | sudo tee /etc/cron.d/desapega-backup
```

Guarda 7 dias em `/var/backups/desapega`. A VPS já tem o remote `r2:` do rclone (usado pelo backup do harmonica-analytics); para copiar também para fora da VPS, use `0 * * * * root BACKUP_REMOTE=r2:backup/desapega /usr/local/bin/desapega-backup` no cron.

Restaurar: `docker compose -f docker-compose.prod.yml stop`, extraia o `.tar.gz` em `/var/lib/desapega` e suba de novo.

## Atualizar

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Os dados ficam em `/var/lib/desapega`, então `git pull` não toca neles.
