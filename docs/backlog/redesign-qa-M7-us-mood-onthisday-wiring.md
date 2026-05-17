# M7 — us/index: wire MoodSlab + "On this day" to live data

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED

## Current state

`app/(tabs)/us/index.tsx`:

- L218-234: `MoodSlab` pair renders hardcoded `mood="Good"`, `sub="7h sleep · calm"`, `bars={[1, 1, 0.7, 1, 0.4]}` for YOU; `mood="Bright"`, `sub="Just finished yoga"`, `bars={[0.5, 1, 1, 1, 0.7]}` for SOFIA.
- L245: "86% IN SYNC · 4-DAY STREAK" kicker hardcoded.
- L484-493: "On this day" rose card ghost numeral `'24` hardcoded.
- L508-519: Quote text `"First morning in the new place. Kitchen smells like cardboard and coffee."` hardcoded.

The rest of the screen is live-wired to 7 hooks.

## Desired state

**MoodSlab**: feed from `useCheckIns().myTodayCheckIn` + `partnerTodayCheckIn`. Map each check-in's `mood` ID to a display `{label, sub, bars}`. Bars come from the last 5 check-ins for each user (pulled by `useCheckIns`), opacity per entry.

**Kicker**: compute `inSyncPct` as `bothCheckedInDays / pastDays` for the rolling 7-day window (already computed in `us/checkins.tsx:75`). Extract to a shared helper in `src/hooks/useCheckIns.ts`. Streak = consecutive days both checked in.

**On this day card**: query `useJournal` + `useMilestones` for entries with `entry_date`'s MM-DD matching today and year < today's year. Pick the oldest. If none, hide the card entirely.

Extract `MoodSlab` / `OnThisDayCard` into `src/components/us/` for reuse.

## Verification

- MoodSlab renders `—` placeholders for users who haven't checked in today.
- Kicker pct matches the Checkins screen's hero pct.
- "On this day" hides on accounts with no historical entries.
