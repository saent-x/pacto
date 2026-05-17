# M1 — Home hero: add `+N% WK` Badge top-right

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · MED
**Spec ref:** `docs/redesign-spec.md` §4.1

## Current state

`app/(tabs)/home/index.tsx:366-373` (the peach `BlockCard` hero around `AnimatedTripleRing`) renders the overline + rings + labels but no badge. Redesign shows a `Badge` top-right of the card.

## Desired state

Add, inside the `BlockCard` as its first child (before the Overline), an absolutely-positioned view containing:

```tsx
<View style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
  <Badge bg="rgba(58,31,20,0.15)" color={C.peachInk}>
    {wkDelta >= 0 ? `+${wkDelta}% WK` : `${wkDelta}% WK`}
  </Badge>
</View>
```

Compute `wkDelta` as the percentage-point change in `ringPct` vs same weekday last week. Reuse the series that feeds `rings-history` (there's likely a history hook already; if not, extend `useCheckIns` / ring aggregator to expose a 7-day rolling comparison). Hide the badge entirely when history has <7 days of data.

## Verification

- Badge visible top-right on the home hero, doesn't overlap the ring.
- Sign shows correctly for positive / negative deltas.
- Hidden on first-week users instead of showing `+0% WK`.
