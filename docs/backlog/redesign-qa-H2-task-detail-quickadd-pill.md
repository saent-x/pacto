# H2 — tasks/[listId]: add sticky bottom quickAdd input pill

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · HIGH
**Spec ref:** `docs/redesign-spec.md` §4.4, §5.1 (quickAdd button)

## Current state

`app/(tabs)/tasks/[listId].tsx` has no quick-add input. Only way to add a task is Stack header plus-btn → `/sheets/new-task`.

## Desired state

Sticky input pill pinned to the bottom of the list, above the tab bar (bottom inset + 110). Single-line text input with placeholder "What's next on {listName}?". On the right, an arrow-up send button whose background animates from `C.cardHi` → list color when `text.trim().length > 0` (spec §5.1); icon color `C.fog` → `C.ink` at the same time. Press send → `create({ title: trimmed, due_date: null, priority: 2 })` via `useTaskItems(listId)`, clear input, keep focus, `Haptics.selectionAsync()`.

## Implementation notes

- Position: wrap the `ScrollView` + pill in a `View flex={1}`, make the pill `position: 'absolute', bottom: insets.bottom + 12, left: 18, right: 18` with `zIndex: 10`.
- Use `KeyboardAvoidingView` behavior="padding" at the screen root (see how `home/index.tsx` handles it if applicable).
- Animate the send button via `useSharedValue` + `interpolateColor` (the same pattern as `new-entry.tsx` private toggle).

## Verification

- Input visible at all times; floats above scroll content.
- Sending creates a task in the current `Today` bucket.
- Empty input keeps button inactive (list-color bg only fires when trimmed length > 0).
