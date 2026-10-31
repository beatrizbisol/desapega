# 0002. Isolate admin via Tailscale host, proxy host gate, Google login and Caddy 404

- Status: accepted
- Date: 2026-10-30
- Deciders: filipe lins

## Context and Problem Statement
The admin panel and its APIs must not be reachable from the public internet, while the public store is. A shared secret alone was weak protection for an internet-facing app.

## Considered Options
- Keep admin on the public host behind a login only
- Network isolation only (Tailscale) without app-level checks
- Layered: tailnet-only host, app-level host gate, Google login with allowlist, edge 404

## Decision Outcome
Chosen option: **layered isolation**. Admin is moved to /admin and /api/admin/*. It is exposed on a tailnet host via `tailscale serve --https=8443`. src/proxy.ts returns 404 for admin and auth paths unless Host equals ADMIN_HOST. Login is Google with ALLOWED_EMAILS rechecked on every request. The public Caddyfile also answers 404 for /admin*, /api/admin* and /api/auth*. The app is bound to 127.0.0.1:43127.

Identity has a third layer outside the code: the Google OAuth client lives in a dedicated GCP project `desapega-513300` (billing disabled) in Testing mode, with only filipemlins@gmail.com and beatrizbisol@gmail.com as test users, on top of ALLOWED_EMAILS.

### Consequences
- Good: no single control failure exposes the admin; compromise needs tailnet access plus an allowed Google account.
- Bad / cost: admin needs Tailscale on the device; the Host-header gate relies on Caddy not forwarding the tailnet host publicly; the Caddy 404 rule is only syntax-validated (verification gap), the app-level 404 is proven by tests.

## More Information
Related: 0003. Walkthrough: docs/walkthroughs/2026-10-30-admin-vpn-hardening.md. Spec: .specs/features/admin-vpn-hardening/.
