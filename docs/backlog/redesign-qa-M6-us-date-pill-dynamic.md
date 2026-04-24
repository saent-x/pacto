# M6 — us/index: make date pill dynamic + solo-aware

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED

## Current state

`app/(tabs)/us/index.tsx:200` hardcodes:

```
THU · 17 · 11 · MATTIA × SOFIA
```

The date and the `MATTIA × SOFIA` label never change, including in solo mode.

## Desired state

Format from `new Date()` and `useSession()`:

```tsx
const now = new Date();
const day = format(now, 'EEE').toUpperCase(); // THU
const date = format(now, 'd').toUpperCase(); // 17
const month = format(now, 'MM').toUpperCase(); // 04 or 11 etc. (design shows "11" as the month number? confirm with design; likely "WK" instead)
const names = isSolo
  ? (user?.displayName ?? 'ME').toUpperCase()
  : `${(user?.displayName ?? 'ME').toUpperCase()} × ${(partner?.displayName ?? 'THEM').toUpperCase()}`;
const pill = `${day} · ${date} · ${month} · ${names}`;
```

Confirm the middle `11` was month-number, week-number, or the year's last two digits — spec doesn't disambiguate. Read the design source (`docs/design-reference/project/src/screens-us-redesigns.jsx`) for the `TogetherEditorial` date-pill expression.

## Verification

- Pill reflects current date.
- Pill shows only the user's name (no ` × PARTNER`) in solo mode.
- Pill length stays constrained (ellipsize if > 28 chars).
