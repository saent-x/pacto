# M4 — new-milestone: wire interactive date picker

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED
**Spec ref:** `docs/redesign-spec.md` §4.20

## Current state

`app/sheets/new-milestone.tsx:125-155` renders a static "When" row showing `format(new Date(), 'MMM d, yyyy')` + a "TAP TO EDIT" label that does nothing. Save uses `dateValue = format(new Date(), 'yyyy-MM-dd')` → every milestone is today's date.

## Desired state

Use `@react-native-community/datetimepicker` the same way `new-reminder.tsx` does (see `new-reminder.tsx:187-196` for reference):

- Tap the When row → toggle inline DateTimePicker below the row.
- `mode="date"`, `display="inline"` on iOS.
- No `minimumDate` (milestones can be in the past — anniversaries, birthdays).
- Update local `date: Date` state; save as `format(date, 'yyyy-MM-dd')`.

## Verification

- Picking a past date saves and renders in the Past chapters section on Milestones screen.
- Picking a future date saves and appears in the Hero card with the correct "IN N DAYS" countdown.
- Tapping the When row twice toggles the picker closed.
