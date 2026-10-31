# 0001. Self-host on a VPS with a JSON-file store instead of a managed DB

- Status: accepted
- Date: 2026-10-30
- Deciders: filipe lins

## Context and Problem Statement
Desapega is a small store (items and reservations) that needed public hosting. Data volume and traffic are low, and the owner wants to control cost and data. The public site is served at desapega.useclubapp.com (A 37.120.166.108, DNS only).

## Considered Options
- VPS with Docker, Caddy and the existing JSON-file store
- Managed database or platform (e.g. hosted Postgres plus serverless hosting)

## Decision Outcome
Chosen option: **VPS with JSON-file store**, because it keeps the existing store, adds no recurring DB cost and no migration, and the scale fits a single process. The store was hardened: DATA_DIR outside the repo, write queue shared via globalThis, atomic and flushed writes, order rollback, hourly backup script.

### Consequences
- Good: simple, cheap, full control of data, no new dependency.
- Bad / cost: single instance only, no cross-process locking, up to 1h data loss between backups, manual ops (Docker, Caddy, backups).

## More Information
Walkthrough: docs/walkthroughs/2026-10-30-admin-vpn-hardening.md. Spec: .specs/features/admin-vpn-hardening/. Deploy: docs/DEPLOY.md.
