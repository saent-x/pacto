# L9 — new-timetable share picker: resolve partner name dynamically

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW

## Current state

`app/sheets/new-timetable.tsx:205` — `{ k: 'partner', l: "Sofia's", s: 'for her', color: '#B8A8E8', icon: 'heart' }` hardcodes "Sofia's" and "for her" (she/her pronoun) regardless of session partner.

`new-timetable.tsx:74` also reads `{share === 'partner' ? "SOFIA'S" : ...}` with the same literal.

## Desired state

Read `partner?.displayName` from `useSession()`; fall back to "Partner". Use generic "for them" copy (or thread through `partner.pronouns` if the profile schema supports it).

In solo mode, disable/hide the `partner` option (mirrors the `isSolo` branching in `new-expense.tsx:192`).

## Verification

- Opening the sheet while partnered with "Alex" shows "Alex's" and "for them".
- Opening in solo mode shows only Solo + Shared options.
