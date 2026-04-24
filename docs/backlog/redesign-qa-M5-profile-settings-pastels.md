# M5 — profile: settings icon tiles use feature pastels

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED
**Spec ref:** `docs/redesign-spec.md` §4.28

## Current state

`app/sheets/profile.tsx:335` renders every settings row with `<IconTile bg={C.cardHi} color={C.gold}/>`. The same monotone tile is also reused for support rows.

## Desired state

Per spec: each setting's tile uses a feature pastel + its ink color. Apply this color map on the `rows` definition (around `app/sheets/profile.tsx:117`):

- `user` → `{ bg: C.goldSoft, color: C.gold }`
- `heart` → `{ bg: 'rgba(216,155,168,0.18)', color: C.rose }` (couple settings)
- `bell` → `{ bg: 'rgba(242,216,106,0.18)', color: C.butterInk }` (notifications)
- `shield` → `{ bg: 'rgba(168,216,185,0.18)', color: C.mintInk }` (privacy)
- Support rows (`send`, `users`) keep `C.goldSoft` / `C.gold`.

Pass `bg` and `color` through the row type → `IconTile` props.

## Verification

- Settings list reads as pastel-per-row instead of monotone gold.
- Ink color contrasts correctly on the pastel background.
