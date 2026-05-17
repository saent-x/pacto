# L2 — Sheet accent audit vs spec §6.5

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW (L2, L3, L4, L5 batched)
**Spec ref:** `docs/redesign-spec.md` §6.5

## Current state vs spec

| Sheet | Current `eyebrowColor` | Spec §6.5 | Delta |
|---|---|---|---|
| `new-reminder.tsx:109` | `C.reminders` | reminders | ✓ |
| `new-entry.tsx:92` | *(not passed)* | journal | missing — add `eyebrowColor={C.journal}` |
| `new-list.tsx:47` | list color | peach (or list color) | ✓ |
| `new-note.tsx:50` | active vibe color | rose | debatable — follows vibe; lock to `C.rose` per spec |
| `new-checkin.tsx:53` | `active.color` (mood) | butter | debatable — follows mood; lock to `C.butter` per spec |
| `new-expense.tsx:78` | `C.mint` | mint | ✓ |
| `new-wish.tsx:49` | `C.peach` | lavender | **change to `C.lavender`** |
| `new-milestone.tsx:96` | `color` state (default `C.rose`) | peach | change default to `C.peach` |
| `new-plan.tsx:87` | `color` state (default `C.sky`) | sky | ✓ |
| `new-timetable.tsx:47` | *(not passed)* | peach | missing — add `eyebrowColor={C.peach}` |
| `new-timetable-item.tsx` | verify | peach | verify |
| `profile.tsx` | check | rose | verify |
| `new-task.tsx` | list color | peach (or list color) | ✓ |

## Action

1. Add `eyebrowColor={C.journal}` to `new-entry.tsx` SheetShell.
2. Add `eyebrowColor={C.peach}` to `new-timetable.tsx` SheetShell.
3. Change `new-wish.tsx` eyebrow from `C.peach` to `C.lavender`.
4. Change `new-milestone.tsx` default color from `C.rose` to `C.peach`.
5. Decide with design: should `new-note` / `new-checkin` accents follow the selected vibe/mood (current) or lock to spec color? Document the decision either way.
6. Audit `new-timetable-item.tsx` and `profile.tsx` for their accent and update if drifted.

## Verification

- All sheet eyebrows render the feature accent on first frame (before user interaction).
- Decision on vibe/mood-linked accents documented in `redesign-spec.md` if reversed.
