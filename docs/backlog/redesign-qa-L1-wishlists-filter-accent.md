# L1 — us/wishlists filter pills: use lavender accent

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW

## Current state

`app/(tabs)/us/wishlists.tsx:164, 169` — filter pill active uses `backgroundColor: C.goldSoft` + `color: C.gold`.

## Desired state

Wishlists feature accent is lavender. Active pill should be `backgroundColor: 'rgba(184,168,232,0.18)'` (lavender × 0.18) + `color: C.lavender`. Inactive pill stays `C.card` bg + `C.mist` text.

Cross-reference the pattern used in `reminders/index.tsx` where `activeBg={C.reminders + soft alpha}` + `activeColor={C.reminders}`.

## Verification

- Active filter reads lavender; inactive stays neutral.
