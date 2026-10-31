# Hide sold items from the public storefront

_Reviewed: 2026-10-31 · Branch: main · Commits: uncommitted_

## Summary
Items with status `sold` no longer appear in the public storefront listing (home and `GET /api/items`). Their detail page stays reachable by direct link and shows a clear "vendido" notice. The admin panel used to reuse the public `/api/items` to refresh its list, so a new admin-guarded `GET /api/admin/items` (all statuses, paginated) was added and the panel now uses it.

## Steps
1. **Store filter** — `src/lib/store.ts`: `listItems({ hideSold })` adds `WHERE status <> 'sold'`; `PageQuery` gained optional `hideSold`, applied in `listPage` as a `status <> 'sold'` clause.
2. **Public list API** — `src/app/api/items/route.ts`: `STATUSES` reduced to `available|reserved` (so `?status=sold` is rejected with 400) and `listItemsPage` is called with `hideSold: true` forced server-side.
3. **Public detail** — `GET /api/items/[id]` still returns sold items (status `sold`). `src/app/item/[id]/page.tsx` shows a dark "Este item já foi vendido" banner, grayscale photos, a struck-through price, a "VENDIDO" badge and a "Ver outros itens disponíveis" link instead of the buy button. `src/app/page.tsx` uses `listItems({ hideSold: true })`. Reserved items are unchanged and stay in the storefront.
4. **Admin list endpoint** — `src/app/api/admin/items/route.ts`: new `GET` guarded by `requireAdmin()`, accepts all three statuses, reuses `parsePageQuery`/`listItemsPage`.
5. **Admin panel** — `src/components/admin-panel.tsx` `fetchAll` now targets `/api/admin/items`.
6. **Tests** — updated `tests/pagination.test.ts`, `orders-route.test.ts`, `admin-routes.test.ts`, `store.test.ts`. Reported: tsc, eslint, vitest 35/35, next build pass (not re-run by reviewer).

## Files changed
- `src/lib/store.ts` — hideSold option for list and paginated queries
- `src/app/api/items/route.ts` — public list forces hideSold, drops sold status filter
- `src/app/item/[id]/page.tsx` — explicit sold state
- `src/app/page.tsx` — home hides sold
- `src/app/api/admin/items/route.ts` — new admin GET list
- `src/components/admin-panel.tsx` — fetch from admin endpoint
- `tests/*` — coverage for the above

## Decisions
- Sold items are filtered out of listings on the server, not just in the UI. Their detail pages stay up so links shared on WhatsApp do not 404.
- Separate admin-guarded list endpoint instead of a public flag/param to include sold.

## Risks / follow-ups
- `status <> 'sold'` is not obviously index-backed; fine at current scale.
