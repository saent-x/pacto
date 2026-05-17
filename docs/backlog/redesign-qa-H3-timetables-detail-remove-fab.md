# H3 — us/timetables/[id]: remove floating gold FAB

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · HIGH
**Spec ref:** `docs/redesign-spec.md` §6.6

## Current state

`app/(tabs)/us/timetables/[id].tsx:256-280` renders a floating `Pressable` at `position: 'absolute', right: 22, bottom: 110` with `C.gold` bg, `C.gold` shadow (radius 16, opacity 0.4), 54×54, plus icon. This is the `PresetApp` FAB from Coupl.html that spec §6.6 explicitly says not to port.

## Desired state

Delete the FAB. The Stack header already provides the plus via `NavAddBtn` in `us/_layout.tsx` for the `timetables/[id]` route — verify `headerRight: () => <NavAddBtn href={`/sheets/new-timetable-item?timetableId=${id}`}/>` is wired in the layout, passing the current timetable id via `useLocalSearchParams`.

## Verification

- No floating button visible on the detail screen.
- Stack header plus routes to `sheets/new-timetable-item` with `timetableId` param.
- Pattern matches every other Us-child screen.
