# L8 — new-wish tag labels: align with spec

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW
**Spec ref:** `docs/redesign-spec.md` §4.27

## Current state

`app/sheets/new-wish.tsx:11` — `TAGS = ['HOME', 'TRAVEL', 'TREATS', 'BIG', 'KITCHEN', 'CLOTHES']`.

Spec §4.27: "category pill row (Home · Hobby · Kitchen · Travel · Date · Other)".

Neither is objectively better; either way, pick one set and use it consistently across the wishlists filter pills (`us/wishlists.tsx`) and any tag-display code in list rows.

## Action

1. Align sheet tags with spec (`Home · Hobby · Kitchen · Travel · Date · Other`) — OR update spec to match current taste (`HOME · TRAVEL · TREATS · BIG · KITCHEN · CLOTHES`).
2. Whichever tag set wins must be consistently displayed uppercased in row metadata and as the active filter label.

## Verification

- Tag options on sheet match tag strings displayed in list rows.
- No orphan tag shown in a row that can't be created from the sheet.
