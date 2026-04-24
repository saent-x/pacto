# M3 — new-checkin: add energy slider

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED
**Spec ref:** `docs/redesign-spec.md` §4.16

## Current state

`app/sheets/new-checkin.tsx` renders mood row (5 options) + "One thing" text input + visibility note. No energy control.

## Desired state

Add an energy picker between the mood row and the "One thing" input. Options per spec: continuous 0–100 slider, labeled "ENERGY" overline, filled by the selected mood color. Thumb 22×22 in the active mood color, track `C.line` with animated fill width driven by `value/100`.

If a slider feels heavy for a form sheet, an acceptable alternative is 5 dot-pills labeled `LOW · 1 · 2 · 3 · 4 · HIGH` mapping to `energy: 1..5`. Confirm direction with design before implementing.

Persist via `createOrUpdate({ mood, energy, note, isPrivate })` — extend the `useCheckIns` hook + InstantDB schema to carry the `energy` field if not already present. Cross-check `instant.schema.ts`.

## Verification

- Slider visible and functional.
- Value persists on reopen.
- Schema migration runs cleanly.
