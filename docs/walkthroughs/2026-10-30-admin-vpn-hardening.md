# Admin VPN hardening and VPS deploy

_Reviewed: 2026-10-30 · Branch: feat/admin-vpn-hardening/s4-deploy (stack: s2-reservation-data <- s1-admin-vpn <- s4-deploy; PRs #1-#3) · Commits: 9b4c52f, d8ad488, c04569f, bca9efd, 6b64685, 1bdd418, 20e5007 (`git diff main..HEAD`)_

Spec: `.specs/features/admin-vpn-hardening/{plan,checks,verification}.md` (tlc-spec-lean). No unchecked items remain in the spec files.

## Summary
The Desapega store was hardened for public hosting on a VPS. The JSON store is now durable and race-safe, public reservations are rate-limited and deduplicated, the admin surface is reachable only on a Tailscale host and behind Google login, and Docker/Caddy/backup artifacts plus vitest coverage were added. Review findings from the-judge were fixed in later commits.

## Steps
1. **Store hardening** (`src/lib/store.ts`, `.gitignore`, `.env.example`) — `DATA_DIR` moved outside the repo; a write queue shared through `globalThis` serializes writes across module instances; JSON is written atomically (temp file + rename) with `flush: true`; order creation rolls back on failure; only `pending` orders can be confirmed (`INVALID_TRANSITION`). Tests in `tests/store.test.ts`.
2. **Public reservation protections** (`src/lib/rate-limit.ts`, `src/app/api/orders/route.ts`) — 5 POST `/api/orders` per IP per hour (IPv6 bucketed per /64, expired windows pruned); one pending reservation per phone; 429 and 409 responses. Tests in `tests/rate-limit.test.ts`, `tests/orders-route.test.ts`.
3. **Admin relocation and host gate** (`src/proxy.ts`, `src/app/api/admin/*`, `src/app/admin/*`) — admin APIs moved from `/api/*` to `/api/admin/*`, page at `/admin`; the proxy returns 404 for admin/auth paths unless the Host equals `ADMIN_HOST` (tailnet host exposed with `tailscale serve --https=8443`). Public `items` routes keep only read access.
4. **Google login** (`src/auth.ts`, `src/auth.config.ts`, `src/lib/admin-guard.ts`, `src/app/api/auth/[...nextauth]`, `src/app/admin/login`) — Auth.js v5 with Google; `ALLOWED_EMAILS` rechecked on every request in the guard (not only at sign-in); the panel page and layout redirect before reading data; `ADMIN_SECRET` removed; unexpected admin errors logged then 500.
5. **Uploads** (`src/lib/uploads.ts`, `src/app/uploads/[file]/route.ts`, `src/app/api/admin/upload/route.ts`) — files stored in `UPLOADS_DIR` (outside `public/`) and served by a route handler.
6. **Deploy artifacts** (`Dockerfile`, `docker-compose.prod.yml`, `deploy/Caddyfile`, `deploy/backup.sh`, `docs/DEPLOY.md`, `.dockerignore`) — app bound to `127.0.0.1:43127`; Caddy fronts `desapega.useclubapp.com` and answers 404 for `/admin*`, `/api/admin*`, `/api/auth*`; hourly backup script; deploy doc.
7. **Tests and smoke** (`vitest.config.ts`, `tests/*`, `scripts/smoke.mjs`, `scripts/check-deploy-doc.mjs`) — vitest introduced (27 tests, 9 files); smoke script exercises a real `next start` build (routes, Google 302 with CSRF).
8. **Verification** (`.specs/.../verification.md`) — independent verifier: all checks PASS; build and smoke pass.

## Files changed
- `src/lib/store.ts` — durable, serialized, rollback-capable store
- `src/lib/rate-limit.ts` — in-memory per-IP limiter
- `src/proxy.ts` — host-based admin gate
- `src/auth.ts`, `src/auth.config.ts`, `src/lib/admin-guard.ts` — Auth.js v5 Google + allowlist
- `src/app/api/admin/**`, `src/app/admin/**` — relocated admin API/UI
- `src/app/uploads/[file]/route.ts`, `src/lib/uploads.ts` — upload serving
- `Dockerfile`, `docker-compose.prod.yml`, `deploy/*`, `docs/DEPLOY.md` — deployment
- `tests/*`, `vitest.config.ts`, `scripts/*` — test and smoke tooling
- `package.json`, `package-lock.json` — next-auth, vitest

## Decisions
- Self-hosted VPS with JSON-file store, instead of a managed DB/platform.
- Admin isolation via Tailscale host + proxy host gate + Google login with per-request allowlist (Caddy 404 as defence in depth).
- Auth.js v5 (next-auth) for Google OAuth, replacing the shared `ADMIN_SECRET`.
- In-memory rate limiting (single instance) with IPv6 /64 bucketing.
- vitest as test runner.

## Risks / follow-ups
- Rate-limit state is per-process and lost on restart; breaks if scaled to multiple instances.
- JSON store has no cross-process locking; single container assumed. Backups hourly, so up to 1h data loss.
- Gap: Caddy 404 rule only syntax-validated (`caddy validate`), not exercised; relies on app-level proxy proof.
- Gap: C23 asserts any `writeFile` used `flush: true`, not specifically the JSON temp write; C18 wording references GET though smoke uses POST.
- Admin host gate trusts the Host header; relies on Caddy not forwarding the tailnet host publicly.
- Unverified by me: tests/build were not re-run; I relied on `verification.md`. Untracked `.tlc/` is unrelated.
