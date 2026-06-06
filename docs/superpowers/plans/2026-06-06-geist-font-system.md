# Geist Font System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Pacto's Instrument Serif + Schibsted Grotesk typography with a Geist + Geist Mono system while keeping the Bitcount logo font.

**Architecture:** Make the cutover at the token/provider layer first, then migrate text components and numeric call sites. Keep existing component exports stable so route screens do not churn unnecessarily, but add a dedicated `Mono` component for deliberate numeric/system data.

**Tech Stack:** Expo SDK 56, React Native 0.85, Expo Router, `expo-font`, `@expo-google-fonts/geist`, `@expo-google-fonts/geist-mono`, TypeScript.

---

## File structure

- Modify `package.json` and `package-lock.json`: install Geist packages and remove unused font packages after call sites no longer import them.
- Modify `src/theme/ThemeProvider.tsx`: load Geist, Geist Mono, and existing Bitcount logo font before `fontsLoaded` becomes true.
- Modify `src/theme/tokens.ts`: define app font roles, keep explicit weight helpers, add `monoFamily`.
- Modify `src/ui/Text.tsx`: route `Serif` through the new display role, keep `T`/`Kick` on Geist, add `Mono`.
- Modify `src/ui/index.ts`: export `Mono` if the barrel does not already export every text component.
- Modify route files with numeric/system text: use `Mono` for timetable times, counters, invite codes, progress values, and compact metadata.

## Task 1: Install Geist font packages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install bundled Expo Google Fonts packages**

Run:

```bash
npx expo install @expo-google-fonts/geist @expo-google-fonts/geist-mono
```

Expected: `package.json` gains `@expo-google-fonts/geist` and `@expo-google-fonts/geist-mono` dependencies, and `package-lock.json` updates.

- [ ] **Step 2: Keep old font packages for now**

Do not remove `@expo-google-fonts/instrument-serif` or `@expo-google-fonts/schibsted-grotesk` in this task. They are removed after TypeScript proves no imports remain.

- [ ] **Step 3: Verify package install**

Run:

```bash
npx tsc --noEmit
```

Expected: any errors are pre-existing code errors, not missing package/module errors for Geist.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Geist font packages"
```

## Task 2: Replace font loading and font tokens

**Files:**
- Modify: `src/theme/ThemeProvider.tsx`
- Modify: `src/theme/tokens.ts`

- [ ] **Step 1: Update `src/theme/ThemeProvider.tsx` imports**

Replace the Instrument Serif and Schibsted imports with these Geist imports. Keep Bitcount unchanged.

```tsx
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
} from '@expo-google-fonts/geist-mono';
import { BitcountPropSingle_400Regular } from '@expo-google-fonts/bitcount-prop-single';
```

- [ ] **Step 2: Update `useFonts` in `src/theme/ThemeProvider.tsx`**

Use exactly these loaded faces:

```tsx
const [fontsLoaded] = useFonts({
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  BitcountPropSingle_400Regular,
});
```

Expected: splash readiness still waits for `fontsLoaded`, but now on Geist, Geist Mono, and Bitcount.

- [ ] **Step 3: Replace `FONTS` and helpers in `src/theme/tokens.ts`**

Replace the existing `FONTS` object and `sansFamily` helper with:

```ts
export const FONTS = {
  display400: 'Geist_400Regular',
  display500: 'Geist_500Medium',
  display600: 'Geist_600SemiBold',
  display700: 'Geist_700Bold',
  sans400: 'Geist_400Regular',
  sans500: 'Geist_500Medium',
  sans600: 'Geist_600SemiBold',
  sans700: 'Geist_700Bold',
  mono400: 'GeistMono_400Regular',
  mono500: 'GeistMono_500Medium',
  mono600: 'GeistMono_600SemiBold',
  pixel: 'BitcountPropSingle_400Regular',
} as const;

export const sansFamily = (weight: number = 500): string =>
  weight >= 650
    ? FONTS.sans700
    : weight >= 550
      ? FONTS.sans600
      : weight >= 450
        ? FONTS.sans500
        : FONTS.sans400;

export const displayFamily = (weight: number = 600): string =>
  weight >= 650
    ? FONTS.display700
    : weight >= 550
      ? FONTS.display600
      : weight >= 450
        ? FONTS.display500
        : FONTS.display400;

export const monoFamily = (weight: number = 500): string =>
  weight >= 550 ? FONTS.mono600 : weight >= 450 ? FONTS.mono500 : FONTS.mono400;
```

- [ ] **Step 4: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: fail only where code still references removed `FONTS.serif` or `FONTS.serifItalic`, if any. Those references are fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/theme/ThemeProvider.tsx src/theme/tokens.ts
git commit -m "feat: load Geist font system"
```

## Task 3: Update text primitives

**Files:**
- Modify: `src/ui/Text.tsx`
- Modify: `src/ui/index.ts`

- [ ] **Step 1: Update imports in `src/ui/Text.tsx`**

Use all three helpers:

```tsx
import { FONTS, displayFamily, monoFamily, sansFamily } from '../theme/tokens';
```

- [ ] **Step 2: Replace the `Serif` implementation internals**

Keep the `Serif` export name for compatibility, but make it a Geist display wrapper. Replace only the style object inside `Serif` with:

```tsx
{
  fontFamily: displayFamily(italic ? 500 : size >= 36 ? 600 : 500),
  fontSize: size,
  lineHeight: Math.round(size * Math.max(lh, 1.08)),
  letterSpacing: size > 40 ? -1.2 : -0.45,
  color: color ?? C.ink,
}
```

This preserves existing call sites while removing the serif dependency. The `italic` prop no longer requests an italic face because the approved system does not include italic roles.

- [ ] **Step 3: Add a `Mono` component after `T`**

Add this component before `Kick`:

```tsx
export function Mono({
  children,
  size = 14,
  weight = 500,
  color,
  lh = 1.2,
  ls = -0.1,
  style,
  numberOfLines,
  ...rest
}: Common & { size?: number; weight?: number; lh?: number; ls?: number }) {
  const C = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: monoFamily(weight),
          fontSize: size,
          lineHeight: Math.round(size * lh),
          letterSpacing: ls,
          color: color ?? C.ink,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
```

- [ ] **Step 4: Confirm `src/ui/index.ts` exports text primitives**

If `src/ui/index.ts` exports all text primitives with `export * from './Text';`, leave it unchanged. If it lists named exports, add `Mono` to that list.

- [ ] **Step 5: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no missing `FONTS.serif` or `FONTS.serifItalic` errors from `src/ui/Text.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Text.tsx src/ui/index.ts
git commit -m "feat: add Geist text primitives"
```

## Task 4: Apply Geist Mono to numeric/system UI

**Files:**
- Modify: `src/app/(tabs)/calendar.tsx`
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/app/(tabs)/tools.tsx`
- Modify: `src/app/checkins.tsx`
- Modify: `src/app/notifications.tsx`
- Modify: `src/app/profile.tsx`
- Modify: `src/app/reminders.tsx`
- Modify: `src/app/spaces.tsx`
- Modify: `src/app/targets.tsx`
- Modify: `src/app/tasks.tsx`
- Modify: `src/app/timetable.tsx`
- Modify: `src/app/journal/[id].tsx`

- [ ] **Step 1: Add `Mono` to imports where needed**

For files importing from `@/ui`, add `Mono` to the named import when the file renders times, counts, invite codes, or progress values.

Example:

```tsx
import { QScreen, SubBar, Serif, T, Kick, Div, Press, RoundBtn, Mono } from '@/ui';
```

- [ ] **Step 2: Convert large count displays**

Replace large numeric-only `Serif` blocks with `Mono`, preserving size, line-height, color, style, and `numberOfLines` props.

Before:

```tsx
<Serif size={72} lh={0.9}>
  {open.length}
</Serif>
```

After:

```tsx
<Mono size={72} weight={600} lh={0.9}>
  {open.length}
</Mono>
```

Apply this pattern in tasks, reminders, targets, timetable, checkins, tools, and home progress counts.

- [ ] **Step 3: Convert time and date metadata**

Replace time-only and date-like `Serif` instances with `Mono`.

Before:

```tsx
<Serif size={18} color={C.ink2} style={{ width: 48 }}>
  {it.time}
</Serif>
```

After:

```tsx
<Mono size={18} weight={500} color={C.ink2} style={{ width: 48 }}>
  {it.time}
</Mono>
```

Apply this to timetable rows, calendar event times, notification/reminder time metadata, and check-in timestamps.

- [ ] **Step 4: Convert invite codes**

Replace invite-code displays with `Mono` and keep letter spacing.

Before:

```tsx
<Serif size={36} style={{ marginTop: 4, letterSpacing: 2 }}>
  {invite.code}
</Serif>
```

After:

```tsx
<Mono size={36} weight={600} style={{ marginTop: 4, letterSpacing: 2 }}>
  {invite.code}
</Mono>
```

Apply this in `src/app/profile.tsx` and `src/app/spaces.tsx`.

- [ ] **Step 5: Keep prose/display headings on `Serif` compatibility wrapper**

Do not convert human-language headings like `today's focus`, `welcome`, `Your spaces`, journal titles, or onboarding titles to `Mono`. They should stay on `Serif`, which now renders Geist display.

- [ ] **Step 6: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no missing import errors for `Mono`, no JSX errors.

- [ ] **Step 7: Commit**

```bash
git add src/app src/ui/Text.tsx src/ui/index.ts
git commit -m "feat: apply mono data typography"
```

## Task 5: Remove old font packages and stale direct font usage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: any source file still importing removed font tokens directly

- [ ] **Step 1: Search for removed font names**

Use the built-in search tool, not shell grep, for these patterns:

```text
InstrumentSerif|SchibstedGrotesk|FONTS\.serif|serifItalic
```

Expected: no source references remain except historical text in the spec or plan files.

- [ ] **Step 2: Remove unused packages**

Run:

```bash
npm uninstall @expo-google-fonts/instrument-serif @expo-google-fonts/schibsted-grotesk
```

Expected: `package.json` and `package-lock.json` remove both packages.

- [ ] **Step 3: Verify direct `fontFamily` usage routes through tokens**

Use the built-in search tool for:

```text
fontFamily:
```

Expected: source `fontFamily` values either use `FONTS.*`, `sansFamily`, `displayFamily`, `monoFamily`, or are inside text primitives. No hardcoded old font family strings remain.

- [ ] **Step 4: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src
git commit -m "chore: remove old font packages"

```

## Task 6: Visual and quality verification

**Files:**
- No planned source edits unless verification exposes a typography regression.

- [ ] **Step 1: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: pass. If unrelated pre-existing lint failures remain, document exact file/rule output before final handoff and do not claim lint passes.

- [ ] **Step 3: Start web smoke server**

Run:

```bash
npm run web
```

Expected: Expo starts the web app. Use the reported local URL for browser smoke testing.

- [ ] **Step 4: Browser smoke test key routes**

Open the Expo web URL and inspect:

- Home tab.
- Tasks screen.
- Timetable screen.
- Journal entry editor.
- Profile or Spaces invite code screen.

Check:

- No missing-font warnings in console.
- Splash screen clears.
- Headings render in Geist, not browser/native fallback serif.
- Counts, times, percentages, and invite codes render in Geist Mono.
- Text remains readable and unclipped at large counter sizes.

- [ ] **Step 5: Fix any smoke-test regressions**

If a font is missing, fix the font import or token string at the source. If a line is clipped, increase that component's `lh` value at the call site or primitive. Re-run the affected route after each fix.

- [ ] **Step 6: Final commit**

If verification required fixes:

```bash
git add src package.json package-lock.json
git commit -m "fix: polish Geist typography migration"
```

If no fixes were required, no commit is needed.
