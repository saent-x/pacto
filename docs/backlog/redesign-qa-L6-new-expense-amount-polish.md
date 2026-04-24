# L6 — new-expense amount input: 48px + dimmed cents

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW (L6, L7 batched)
**Spec ref:** `docs/redesign-spec.md` §4.18

## Current state

`app/sheets/new-expense.tsx:101-117` — single TextInput at `fontSize: 64`, no cents differentiation.

## Desired state

Per spec: Bricolage 48px with € prefix, cents dimmed to opacity 0.6. Options:

1. Keep a single TextInput, but wrap the displayed value in a `<Text>` overlay (positioned absolute over the input) that splits `whole.decimal` into two `<Text>` spans with different opacity. Harder UX because the cursor won't line up.
2. Render a non-editable decorative `<Text>` when the input isn't focused, showing `€{whole}<Text opacity=0.6>.{cents}</Text>`. Swap to editable TextInput on focus.
3. Split into two TextInputs (whole / cents) with a `.` separator. Simplest to implement cleanly.

Whichever path: drop font size from 64 → 48 per spec.

## Verification

- Amount renders with cents visually dimmer.
- Font scale matches the Checkins / Expenses hero amount scale (both use 48–56).
