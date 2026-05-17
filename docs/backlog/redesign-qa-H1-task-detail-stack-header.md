# H1 — tasks/[listId]: replace in-body coal-band header with Stack header

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · HIGH
**Spec refs:** `docs/redesign-spec.md` §4.4, §6.4

## Current state

`app/(tabs)/tasks/[listId].tsx:118-165` renders a coal-band header inside the screen body (back-round-btn + list-color pill + plus-round-btn + 34-Display title + progress bar). `app/(tabs)/tasks/_layout.tsx` declares only `<Stack.Screen name="index"/>` — `[listId]` falls through to `headerShown: false`, so the screen has no native header.

## Desired state

Per spec §6.4: first visible body element should be the hero card / section header, **not** a header block.

1. Add a `<Stack.Screen name="[listId]" options={{ ... }}/>` entry in `app/(tabs)/tasks/_layout.tsx`. `options` must set `headerShown: true`, `headerTransparent: true`, `headerTitle: () => <HeaderBrand title={listName.toUpperCase()} accent={listColor}/>`, `headerLeft: () => <HeaderLeft mode="back"/>`, `headerRight: () => <NavAddBtn href={`/sheets/new-task?listId=${listId}`}/>`. Dynamic title/accent requires reading the list via `useLocalSearchParams` + `useTaskLists` in the layout (same pattern as `us/_layout.tsx`).
2. Delete `app/(tabs)/tasks/[listId].tsx:118-165` (the coal-band wrapper).
3. Move the progress bar + `{done}/{tasks.length}` counter into the screen body as the first card, under the Stack header.
4. Wrap the body in `<Screen underHeader>` so content offsets correctly under the transparent native header (cf. `us/plans.tsx`).

## Verification

- Stack header renders centered `HEADER.` + eyebrow + wavy underline in list accent color.
- No double-header visual on scroll.
- Back chevron works; plus routes to new-task sheet with `listId` param.
- Progress bar visible in body; counter right-aligned on the same row.
