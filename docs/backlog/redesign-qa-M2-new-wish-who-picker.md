# M2 — new-wish: add who-picker (Sofia's / Mine / Shared)

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED
**Spec ref:** `docs/redesign-spec.md` §4.27

## Current state

`app/sheets/new-wish.tsx` has title + price + link + tag, no who-picker. `useQuickAddWishItem` writes `addedBy: user.id` unconditionally, so every wish is always "Mine" on the Wishlists screen — the SHARED and PARTNER filters are permanently empty.

## Desired state

Add a who segmented picker (`Mine` / `Partner's` / `Shared`) under the Tag row, before the Save button. Partner option label resolves to `partner.displayName` via `useSession()`; hide the Partner + Shared options if `isSolo`.

- Mine → `addedBy: user.id, forUser: null`
- Partner's → `addedBy: user.id, forUser: partner.id` (you're gifting / hinting)
- Shared → `addedBy: user.id, forUser: 'shared'` (both want it)

Adjust the `useAllWishlistItems` row `who` derivation in `wishlists.tsx:43-61` accordingly.

## Verification

- All three filter tabs (MINE / PARTNER'S / SHARED) return rows on a demo dataset with one of each.
- Solo mode renders only "Mine" option.
- New wishes save with the chosen who.
