# L10 — SignIn: restore ambient radial blobs

**Source:** [docs/redesign-qa-report.md](../redesign-qa-report.md) · LOW
**Spec ref:** `docs/redesign-spec.md` §5.8

## Current state

`app/(auth)/sign-in.tsx` renders CouplRings hero on plain `C.ink` background. No ambient decoration.

## Desired state

Two 240×240 radial-gradient blobs behind the content:

- Gold blob, top-right, 0.13 alpha, center ~ `{ x: '100%', y: '0%' }`.
- Rose blob, bottom-left, 0.13 alpha, center ~ `{ x: '0%', y: '100%' }`.

RN doesn't ship a native radial gradient. Use one of:

1. `expo-linear-gradient` with `RadialGradient` from `react-native-linear-gradient` (added dep).
2. Static `<Svg>` with `<RadialGradient>` filling a `<Circle>` — lightweight, no new dep.
3. PNG overlay (least preferred; fixed palette).

Prefer option 2. Hardware accelerate by keeping the blobs in a separate `Animated.View` with `collapsable: false`.

## Verification

- Sign-in screen shows two soft warm glow areas without introducing noticeable color banding.
- No perf regression on low-end devices (blobs are static, shouldn't re-render).
