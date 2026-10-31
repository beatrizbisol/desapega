# Deploy na VPS

Mesma VPS do harmonica-analytics (tailnet `tail4f62e1.ts.net`).

| Quem | Endereço | Caminho |
|---|---|---|
| Público (vitrine e reserva) | `https://desapega.useclubapp.com` | Cloudflare DNS (nuvem cinza) → Caddy → `127.0.0.1:43127` |
| Admin (só na tailnet) | `https://harmonica-analytics.tail4f62e1.ts.net:8443/admin` | `tailscale serve` → `127.0.0.1:43127` |

O app escuta só em `127.0.0.1`. O Caddy responde 404 para `/admin`, `/api/admin` e `/api/auth`, e o próprio app (`src/proxy.ts`) também dá 404 nessas rotas para qualquer host diferente de `ADMIN_HOST`.

## 1. DNS (Cloudflare da Beatriz)

Na zona `useclubapp.com`, crie um registro `A` com nome `desapega` apontando para o IP público da VPS, em **DNS only** (nuvem cinza). Com a nuvem laranja o app veria o IP da Cloudflare e o limite de reservas por IP valeria para todos os visitantes juntos.

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
| `DATA_DIR` | `/data` (já definido no compose) |
| `UPLOADS_DIR` | `/data/uploads` (já definido no compose) |

## 5. App

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:43127/api/items   # 200
```

## 6. Caddy (site público)

```bash
sudo apt install -y caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Antes, confira que nada mais usa as portas 80 e 443 do IP público: `sudo ss -ltnp '( sport = :80 or sport = :443 )'`.

O firewall da VPS só libera SSH (setup do harmonica-analytics). Abra HTTP/HTTPS para o Caddy:

```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

## 7. Admin pela tailnet

```bash
sudo tailscale serve --bg --https=8443 http://127.0.0.1:43127
tailscale serve status
```

Não ligue o Funnel nessa porta: sem Funnel, a 8443 só existe dentro da tailnet.

## 8. Backup de hora em hora

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
