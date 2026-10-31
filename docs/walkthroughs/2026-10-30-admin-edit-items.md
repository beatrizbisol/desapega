# Edit items from the admin panel

_Reviewed: 2026-10-30 · Branch: main · Commits: uncommitted_

## Summary
The admin could only change an item's status or delete it. This stage adds editing of title, description, price and photos by reusing the "Novo item" form in an edit mode, and tightens the existing PATCH endpoint so it cannot blank required fields.

## Steps
1. **Harden PATCH validation** — `src/app/api/admin/items/[id]/route.ts`: blank title/description now return 400, and an empty photos array returns 400 ("Adicione pelo menos uma foto."). Same rules as create.
2. **Add edit state to the panel** — `src/components/admin-panel.tsx`: `editingId` state, `resetForm()` and `startEdit(item)` (prefills title, description, photos, and price with a decimal comma; clears messages; scrolls to top).
3. **Unify create/save** — `createItem` became `saveItem`: POST `/api/admin/items` when not editing, PATCH `/api/admin/items/:id` when editing; success message differs; form resets afterwards.
4. **UI affordances** — form heading/help text switch by mode; submit shows "Salvar alterações"; "Cancelar edição" button appears while editing; each list row gets a Pencil "Editar" icon button.
5. **Edge case** — deleting the item currently being edited resets the form.
6. **Test** — `tests/admin-routes.test.ts`: full-field PATCH returns 200 with the new values; `{title:"  "}`, `{description:""}`, `{photos:[]}` each return 400.

## Files changed
- `src/app/api/admin/items/[id]/route.ts` — PATCH rejects blank title/description and empty photos.
- `src/components/admin-panel.tsx` — edit mode on the item form, Editar button.
- `tests/admin-routes.test.ts` — edit and 400-case test.

## Decisions
- Reuse the create form for editing rather than building a separate edit screen or inline row editor.
- PATCH enforces the same required-field rules as create (server-side), not only in the UI.
(Both are small; no ADR proposed.)

## Risks / follow-ups
- Blank-title check relies on `patch.title` being trimmed earlier in the handler (not visible in the diff); the test with `"  "` passes, which supports this.
- Editing replaces the whole photo list; there is no concurrent-edit protection (last write wins).
- Verification claims (vitest 34/34, eslint, tsc, Playwright run) come from the caller; not re-run here.
- Working tree also has untracked `.tlc/`, not part of this stage.
