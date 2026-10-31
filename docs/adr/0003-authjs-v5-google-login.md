# 0003. Use Auth.js v5 Google login instead of ADMIN_SECRET

- Status: accepted
- Date: 2026-10-30
- Deciders: filipe lins

## Context and Problem Statement
Admin access used a single shared ADMIN_SECRET: no per-user identity, hard to rotate, and easy to leak. We needed real identities with a small allowlist.

## Considered Options
- Keep ADMIN_SECRET
- Auth.js v5 (next-auth) with the Google provider and an email allowlist
- Hand-rolled OAuth

## Decision Outcome
Chosen option: **Auth.js v5 with Google**, because it is the maintained standard for Next.js, handles CSRF and OAuth flow, and an allowlist (ALLOWED_EMAILS) gives per-user access. The allowlist is rechecked per request in src/lib/admin-guard.ts, so removing an email takes effect immediately. ADMIN_SECRET was removed. The OAuth client is in the dedicated GCP project `desapega-513300` in Testing mode with two test users, adding a Google-side restriction.

### Consequences
- Good: per-user identity, immediate revocation, no shared secret.
- Bad / cost: new dependency (v5 API), depends on Google; Testing-mode OAuth limits users to the listed test users, which is intended but must be updated when adding admins.

## More Information
Related: 0002. Walkthrough: docs/walkthroughs/2026-10-30-admin-vpn-hardening.md.
