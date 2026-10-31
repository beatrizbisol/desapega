# 0004. In-memory rate limit for public reservations (5 per IP per hour, IPv6 /64)

- Status: accepted
- Date: 2026-10-30
- Deciders: filipe lins

## Context and Problem Statement
POST /api/orders is public and could be spammed to fill the store with fake reservations. We needed a cheap limiter on a single-instance deployment.

## Considered Options
- In-memory per-process limiter
- Redis or external store limiter
- Edge/Caddy-level rate limiting

## Decision Outcome
Chosen option: **in-memory limiter** (src/lib/rate-limit.ts): 5 POST /api/orders per IP per hour, IPv6 addresses bucketed per /64, expired windows pruned, 429 on excess; plus one pending reservation per phone (409). It requires real client IPs: DNS for desapega.useclubapp.com is DNS only (not proxied), so client IPs reach Caddy and are forwarded to the app.

### Consequences
- Good: no extra infrastructure, easy to test.
- Bad / cost: state is lost on restart and not shared across instances, so it must be revisited if the app is scaled out; correctness depends on trusted forwarded IP headers from Caddy.

## More Information
Related: 0001. Walkthrough: docs/walkthroughs/2026-10-30-admin-vpn-hardening.md.
