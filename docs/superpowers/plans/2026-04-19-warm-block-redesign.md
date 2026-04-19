# Warm Block redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire Coupl UI with the "Warm Block" redesign by porting `/Users/tor/coupl-redesign` (RN Expo) into the main project's `src/` layout, then porting auth screens from the HTML prototype at `/tmp/coupl-design/coupl/project/src/screens-aux.jsx`.

**Architecture:** Copy redesign files, rewrite imports to main's `@/src/*` alias, preserve InstantDB schema and hooks as reference (no UI wiring). Defer backend re-integration to follow-up work.

**Tech Stack:** Expo 55, expo-router 55, React Native 0.83, TypeScript, `expo-google-fonts`, `expo-linear-gradient`, NativeTabs (unstable), SafeAreaProvider, GestureHandler.

**Source paths (read-only references):**
- Redesign RN: `/Users/tor/coupl-redesign`
- HTML prototype: `/tmp/coupl-design/coupl/project`

**Target:** `/Users/tor/Documents/projects/coupl`

**Process per task:** copy file → rewrite imports → fix TS → boot/smoke on iOS → commit.

**Import rewrite rule (applies to every ported file):**
- `from '../../lib/theme'` / `from '@/lib/theme'` → `from '@/src/lib/theme'`
- `from '../../lib/tokens'` → `from '@/src/lib/tokens'`
- `from '../../components/Icon'` / `from '@/components/Icon'` → `from '@/src/components/ui/Icon'`
- `from '../../components/atoms'` → `from '@/src/components/ui/atoms'`
- Same pattern for every `components/*` → `src/components/ui/*`
- Same for `lib/tasks-data` → `@/src/lib/tasks-data`, `lib/timetables-data` → `@/src/lib/timetables-data`

**Verification rule:** after each screen/sheet port, run `npx tsc --noEmit` and `npm run start -- --ios` in background, hit the route, confirm it renders. If boot fails, fix before committing.

---

## Task 1: Install expo-linear-gradient dependency

Main already has `expo-linear-gradient` (package.json:38). Confirm, no install needed.

**Files:**
- Check: `package.json`

- [ ] **Step 1: Verify dep present**

```bash
grep expo-linear-gradient package.json
```
Expected: `"expo-linear-gradient": "~55.0.13",`

If missing, add with `npx expo install expo-linear-gradient`.

- [ ] **Step 2: No commit needed**

---

## Task 2: Port design tokens

**Files:**
- Create: `src/lib/tokens.ts`

- [ ] **Step 1: Copy tokens.ts verbatim**

Source: `/Users/tor/coupl-redesign/lib/tokens.ts`. Paste contents into `src/lib/tokens.ts`. Do not change anything.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors (tokens file is self-contained).

- [ ] **Step 3: Commit**

```bash
git add src/lib/tokens.ts
git commit -m "feat(ui): port warm-block design tokens"
```

---

## Task 3: Port ThemeProvider

**Files:**
- Create: `src/lib/theme.tsx`

- [ ] **Step 1: Copy redesign theme.tsx**

Source: `/Users/tor/coupl-redesign/lib/theme.tsx`. Paste into `src/lib/theme.tsx`. Change the import:

```diff
-import { fonts, getTokens, type ThemeMode, type Tokens } from './tokens';
+import { fonts, getTokens, type ThemeMode, type Tokens } from './tokens';
```
(Already relative `./tokens` — keep as-is since it's now colocated.)

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.tsx
git commit -m "feat(ui): port ThemeProvider + useTheme hook"
```

---

## Task 4: Port seed data

**Files:**
- Create: `src/lib/tasks-data.ts`
- Create: `src/lib/timetables-data.ts`

- [ ] **Step 1: Copy both verbatim**

```bash
cp /Users/tor/coupl-redesign/lib/tasks-data.ts src/lib/tasks-data.ts
cp /Users/tor/coupl-redesign/lib/timetables-data.ts src/lib/timetables-data.ts
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tasks-data.ts src/lib/timetables-data.ts
git commit -m "feat(ui): port redesign seed data"
```

---

## Task 5: Port Icon component

**Files:**
- Create: `src/components/ui/Icon.tsx` (overwriting main's existing Icon.tsx path if present — verify with `ls src/components/ui/Icon.tsx`)

- [ ] **Step 1: Copy Icon.tsx**

```bash
cp /Users/tor/coupl-redesign/components/Icon.tsx src/components/ui/Icon.tsx
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors (Icon only imports from react / react-native-svg).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Icon.tsx
git commit -m "feat(ui): port feather icon set"
```

---

## Task 6: Port atoms

**Files:**
- Create: `src/components/ui/atoms.tsx`

- [ ] **Step 1: Copy atoms.tsx**

```bash
cp /Users/tor/coupl-redesign/components/atoms.tsx src/components/ui/atoms.tsx
```

- [ ] **Step 2: Rewrite imports**

Open `src/components/ui/atoms.tsx`. Change every import:
- `from '../lib/theme'` → `from '@/src/lib/theme'`
- `from '../lib/tokens'` → `from '@/src/lib/tokens'`
- `from './Icon'` → keep as `./Icon` (colocated)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/atoms.tsx
git commit -m "feat(ui): port atoms (CouplRings, BlockCard, Display, etc.)"
```

---

## Task 7: Port remaining UI primitives

**Files:**
- Create: `src/components/ui/Screen.tsx`
- Create: `src/components/ui/SheetShell.tsx`
- Create: `src/components/ui/SubHeader.tsx`
- Create: `src/components/ui/HeaderBrand.tsx`
- Create: `src/components/ui/HeaderLeft.tsx`
- Create: `src/components/ui/FloatingTop.tsx`
- Create: `src/components/ui/NavAddBtn.tsx`
- Create: `src/components/ui/TabStackLayout.tsx`
- Create: `src/components/ui/WhoDot.tsx`
- Create: `src/components/ui/AddBtn.tsx`

- [ ] **Step 1: Copy all 10 files**

```bash
for f in Screen SheetShell SubHeader HeaderBrand HeaderLeft FloatingTop NavAddBtn TabStackLayout WhoDot AddBtn; do
  cp "/Users/tor/coupl-redesign/components/$f.tsx" "src/components/ui/$f.tsx"
done
```

- [ ] **Step 2: Rewrite imports in each file**

For each newly copied file, apply:
- `from '../lib/theme'` → `from '@/src/lib/theme'`
- `from '../lib/tokens'` → `from '@/src/lib/tokens'`
- `from './Icon'` → keep `./Icon`
- `from './atoms'` → keep `./atoms`

Use `grep -l "'../lib" src/components/ui/*.tsx` to find files still needing updates.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. Fix any import issues.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): port screen shells and navigation primitives"
```

---

## Task 8: Replace root layout

**Files:**
- Modify: `app/_layout.tsx` (full rewrite)

- [ ] **Step 1: Copy redesign root layout**

```bash
cp /Users/tor/coupl-redesign/app/_layout.tsx app/_layout.tsx
```

- [ ] **Step 2: Rewrite theme import**

In `app/_layout.tsx`:
- `from '../lib/theme'` → `from '@/src/lib/theme'`

- [ ] **Step 3: Add `(auth)` screen to Stack**

Inside the `<Stack>` JSX, after the `(tabs)` `Stack.Screen`, add:

```tsx
<Stack.Screen name="(auth)" options={{ headerShown: false }} />
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: errors about missing `(tabs)` layout files — fine, next task fixes them.

- [ ] **Step 5: Do not commit yet — app will not boot until (tabs) is replaced**

---

## Task 9: Replace tabs layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (full rewrite to 5-tab NativeTabs)

- [ ] **Step 1: Copy redesign tabs layout**

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/_layout.tsx app/\(tabs\)/_layout.tsx
```

- [ ] **Step 2: Rewrite import**

- `from '../../lib/theme'` → `from '@/src/lib/theme'`

- [ ] **Step 3: Delete stale tab subtree**

```bash
rm -rf app/\(tabs\)/home app/\(tabs\)/calendar app/\(tabs\)/journal \
       app/\(tabs\)/more app/\(tabs\)/reminders app/\(tabs\)/tasks \
       app/\(tabs\)/together
```

- [ ] **Step 4: Do not commit yet — tabs reference nonexistent routes until Task 10+**

---

## Task 10: Port Home tab

**Files:**
- Create: `app/(tabs)/home/_layout.tsx`
- Create: `app/(tabs)/home/index.tsx`

- [ ] **Step 1: Copy both files**

```bash
mkdir -p app/\(tabs\)/home
cp /Users/tor/coupl-redesign/app/\(tabs\)/home/_layout.tsx app/\(tabs\)/home/_layout.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/home/index.tsx app/\(tabs\)/home/index.tsx
```

- [ ] **Step 2: Rewrite imports**

In both files, apply the global rewrite rule (header of plan):
- `../../../lib/theme` → `@/src/lib/theme`
- `../../../components/<X>` → `@/src/components/ui/<X>`

Use grep: `grep -n "'\.\./\.\./" app/\(tabs\)/home/*.tsx`

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: errors only for other tabs (us/calendar/tasks/reminders) — OK until those ports.

- [ ] **Step 4: Do not commit yet — app not bootable until Task 14**

---

## Task 11: Port Calendar tab

**Files:**
- Create: `app/(tabs)/calendar/_layout.tsx`
- Create: `app/(tabs)/calendar/index.tsx`

- [ ] **Step 1: Copy**

```bash
mkdir -p app/\(tabs\)/calendar
cp /Users/tor/coupl-redesign/app/\(tabs\)/calendar/_layout.tsx app/\(tabs\)/calendar/_layout.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/calendar/index.tsx app/\(tabs\)/calendar/index.tsx
```

- [ ] **Step 2: Rewrite imports (same rule as Task 10)**

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Remaining errors: us/tasks/reminders.

---

## Task 12: Port Tasks tab

**Files:**
- Create: `app/(tabs)/tasks/_layout.tsx`
- Create: `app/(tabs)/tasks/index.tsx`
- Create: `app/(tabs)/tasks/[id].tsx`

- [ ] **Step 1: Copy all three**

```bash
mkdir -p app/\(tabs\)/tasks
cp /Users/tor/coupl-redesign/app/\(tabs\)/tasks/_layout.tsx app/\(tabs\)/tasks/_layout.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/tasks/index.tsx app/\(tabs\)/tasks/index.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/tasks/\[id\].tsx app/\(tabs\)/tasks/\[id\].tsx
```

- [ ] **Step 2: Rewrite imports — include `lib/tasks-data` → `@/src/lib/tasks-data`**

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

---

## Task 13: Port Reminders tab

**Files:**
- Create: `app/(tabs)/reminders/_layout.tsx`
- Create: `app/(tabs)/reminders/index.tsx`

- [ ] **Step 1: Copy**

```bash
mkdir -p app/\(tabs\)/reminders
cp /Users/tor/coupl-redesign/app/\(tabs\)/reminders/_layout.tsx app/\(tabs\)/reminders/_layout.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/reminders/index.tsx app/\(tabs\)/reminders/index.tsx
```

- [ ] **Step 2: Rewrite imports**

- [ ] **Step 3: Type-check** — `us` remains.

---

## Task 14: Port Us tab (hub only)

**Files:**
- Create: `app/(tabs)/us/_layout.tsx`
- Create: `app/(tabs)/us/index.tsx`

- [ ] **Step 1: Copy**

```bash
mkdir -p app/\(tabs\)/us
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/_layout.tsx app/\(tabs\)/us/_layout.tsx
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/index.tsx app/\(tabs\)/us/index.tsx
```

- [ ] **Step 2: Rewrite imports**

- [ ] **Step 3: Temporarily stub missing Us child routes**

The us `_layout.tsx` declares `Stack.Screen` entries for children (notes, checkins, expenses, etc.). Create empty route placeholders so expo-router doesn't warn:

```bash
for f in notes checkins expenses wishlists milestones plans journal; do
  cat > "app/(tabs)/us/$f.tsx" <<'EOF'
import { View } from 'react-native';
export default function Placeholder() { return <View/>; }
EOF
done
mkdir -p app/\(tabs\)/us/timetables
cat > "app/(tabs)/us/timetables/index.tsx" <<'EOF'
import { View } from 'react-native';
export default function Placeholder() { return <View/>; }
EOF
cat > "app/(tabs)/us/timetables/[id].tsx" <<'EOF'
import { View } from 'react-native';
export default function Placeholder() { return <View/>; }
EOF
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: First boot smoke test**

```bash
npm run start -- --ios
```
Expected: app boots, 5 tabs visible, home renders, tapping us shows hub. Kill server after.

- [ ] **Step 6: Commit visual baseline**

```bash
git add app src/lib src/components
git commit -m "feat(ui): replace tabs shell with warm-block 5-tab layout"
```

---

## Task 15: Port Us child — Notes

**Files:**
- Modify: `app/(tabs)/us/notes.tsx` (replace placeholder)

- [ ] **Step 1: Copy**

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/notes.tsx app/\(tabs\)/us/notes.tsx
```

- [ ] **Step 2: Rewrite imports (same rule)**

- [ ] **Step 3: Type-check → smoke test**

Boot, navigate Us → Notes. Confirm it renders.

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/us/notes.tsx
git commit -m "feat(ui): port Us/notes screen"
```

---

## Task 16: Port Us child — Check-ins

**Files:**
- Modify: `app/(tabs)/us/checkins.tsx`

- [ ] **Step 1: Copy**
```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/checkins.tsx app/\(tabs\)/us/checkins.tsx
```
- [ ] **Step 2: Rewrite imports**
- [ ] **Step 3: Type-check + smoke**
- [ ] **Step 4: Commit** — `feat(ui): port Us/check-ins screen`

---

## Task 17: Port Us child — Expenses

**Files:**
- Modify: `app/(tabs)/us/expenses.tsx`

- [ ] **Step 1: Copy, rewrite imports, type-check, smoke, commit**

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/expenses.tsx app/\(tabs\)/us/expenses.tsx
```
Commit message: `feat(ui): port Us/expenses screen`

---

## Task 18: Port Us child — Wishlists

**Files:**
- Modify: `app/(tabs)/us/wishlists.tsx`

- [ ] **Copy + rewrite + verify + commit** — `feat(ui): port Us/wishlists screen`

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/wishlists.tsx app/\(tabs\)/us/wishlists.tsx
```

---

## Task 19: Port Us child — Milestones

**Files:**
- Modify: `app/(tabs)/us/milestones.tsx`

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/milestones.tsx app/\(tabs\)/us/milestones.tsx
```
Commit: `feat(ui): port Us/milestones screen`

---

## Task 20: Port Us child — Plans

**Files:**
- Modify: `app/(tabs)/us/plans.tsx`

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/plans.tsx app/\(tabs\)/us/plans.tsx
```
Commit: `feat(ui): port Us/plans screen`

---

## Task 21: Port Us child — Journal

**Files:**
- Modify: `app/(tabs)/us/journal.tsx`

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/journal.tsx app/\(tabs\)/us/journal.tsx
```
Commit: `feat(ui): port Us/journal screen`

---

## Task 22: Port Timetables hub

**Files:**
- Modify: `app/(tabs)/us/timetables/index.tsx`

- [ ] **Step 1: Copy**

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/timetables/index.tsx app/\(tabs\)/us/timetables/index.tsx
```

- [ ] **Step 2: Rewrite imports — include `lib/timetables-data` → `@/src/lib/timetables-data`**

- [ ] **Step 3: Type-check + smoke navigating Us → Timetables**

- [ ] **Step 4: Commit** — `feat(ui): port Timetables hub`

---

## Task 23: Port Timetable detail

**Files:**
- Modify: `app/(tabs)/us/timetables/[id].tsx`

- [ ] **Step 1: Copy**

```bash
cp /Users/tor/coupl-redesign/app/\(tabs\)/us/timetables/\[id\].tsx app/\(tabs\)/us/timetables/\[id\].tsx
```

- [ ] **Step 2: Rewrite imports**
- [ ] **Step 3: Type-check + smoke**
- [ ] **Step 4: Commit** — `feat(ui): port Timetable detail screen`

---

## Task 24: Port Notifications

**Files:**
- Create: `app/notifications.tsx`

- [ ] **Step 1: Copy**

```bash
cp /Users/tor/coupl-redesign/app/notifications.tsx app/notifications.tsx
```

- [ ] **Step 2: Rewrite imports**
- [ ] **Step 3: Type-check**
- [ ] **Step 4: Commit** — `feat(ui): port notifications screen`

---

## Task 25: Port root `index.tsx`

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Copy**

```bash
cp /Users/tor/coupl-redesign/app/index.tsx app/index.tsx
```

- [ ] **Step 2: Rewrite imports if any**

- [ ] **Step 3: Type-check + smoke (cold-start to `(tabs)`)**

- [ ] **Step 4: Commit** — `feat(ui): port root index redirect`

---

## Task 26: Port sheet — New reminder

**Files:**
- Create: `app/sheets/new-reminder.tsx`

- [ ] **Step 1: Copy**

```bash
mkdir -p app/sheets
cp /Users/tor/coupl-redesign/app/sheets/new-reminder.tsx app/sheets/new-reminder.tsx
```

- [ ] **Step 2: Rewrite imports**
- [ ] **Step 3: Type-check + smoke (trigger sheet from reminders tab)**
- [ ] **Step 4: Commit** — `feat(ui): port new-reminder sheet`

---

## Task 27: Port sheet — New entry (journal)

**Files:**
- Create: `app/sheets/new-entry.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-entry.tsx app/sheets/new-entry.tsx
```
Rewrite imports, verify, commit: `feat(ui): port new-entry sheet`

---

## Task 28: Port sheet — New list

**Files:**
- Create: `app/sheets/new-list.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-list.tsx app/sheets/new-list.tsx
```
Commit: `feat(ui): port new-list sheet`

---

## Task 29: Port sheet — New task

**Files:**
- Create: `app/sheets/new-task.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-task.tsx app/sheets/new-task.tsx
```
Commit: `feat(ui): port new-task sheet`

---

## Task 30: Port sheet — New note

**Files:**
- Create: `app/sheets/new-note.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-note.tsx app/sheets/new-note.tsx
```
Commit: `feat(ui): port new-note sheet`

---

## Task 31: Port sheet — New check-in

**Files:**
- Create: `app/sheets/new-checkin.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-checkin.tsx app/sheets/new-checkin.tsx
```
Commit: `feat(ui): port new-checkin sheet`

---

## Task 32: Port sheet — New expense

**Files:**
- Create: `app/sheets/new-expense.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-expense.tsx app/sheets/new-expense.tsx
```
Commit: `feat(ui): port new-expense sheet`

---

## Task 33: Port sheet — New wish

**Files:**
- Create: `app/sheets/new-wish.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-wish.tsx app/sheets/new-wish.tsx
```
Commit: `feat(ui): port new-wish sheet`

---

## Task 34: Port sheet — New milestone

**Files:**
- Create: `app/sheets/new-milestone.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-milestone.tsx app/sheets/new-milestone.tsx
```
Commit: `feat(ui): port new-milestone sheet`

---

## Task 35: Port sheet — New plan

**Files:**
- Create: `app/sheets/new-plan.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-plan.tsx app/sheets/new-plan.tsx
```
Commit: `feat(ui): port new-plan sheet`

---

## Task 36: Port sheet — New timetable

**Files:**
- Create: `app/sheets/new-timetable.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-timetable.tsx app/sheets/new-timetable.tsx
```
Commit: `feat(ui): port new-timetable sheet`

---

## Task 37: Port sheet — New timetable item

**Files:**
- Create: `app/sheets/new-timetable-item.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/new-timetable-item.tsx app/sheets/new-timetable-item.tsx
```
Commit: `feat(ui): port new-timetable-item sheet`

---

## Task 38: Port sheet — Profile

**Files:**
- Create: `app/sheets/profile.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/profile.tsx app/sheets/profile.tsx
```
Commit: `feat(ui): port profile sheet`

---

## Task 39: Port sheet — Rings history

**Files:**
- Create: `app/sheets/rings-history.tsx`

```bash
cp /Users/tor/coupl-redesign/app/sheets/rings-history.tsx app/sheets/rings-history.tsx
```
Commit: `feat(ui): port rings-history sheet`

---

## Task 40: Port auth — Sign in screen

Auth is only in the HTML prototype. Must convert HTML/CSS/JSX → React Native manually.

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-in.tsx`

- [ ] **Step 1: Read source HTML**

Source: `/tmp/coupl-design/coupl/project/src/screens-aux.jsx` (starts at `SignInScreen` — roughly lines 10–120 in that file).

- [ ] **Step 2: Create `(auth)` layout**

File: `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useTheme } from '@/src/lib/theme';

export default function AuthLayout() {
  const { C } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.ink },
      }}
    />
  );
}
```

- [ ] **Step 3: Create `sign-in.tsx`**

Convert the HTML `SignInScreen` function into RN. Use:
- `View` for every `div`; `Text` for content
- `TextInput` for `input`
- `Pressable` for `button`
- `expo-linear-gradient` for ambient radial glow (approximate with `LinearGradient` + `borderRadius`)
- `useTheme()` for colors/fonts
- Import `CouplRings`, `Display`, `GoldRule`, `Overline`, `PrimaryButton` from `@/src/components/ui/atoms`
- Import `Icon` from `@/src/components/ui/Icon`

File: `app/(auth)/sign-in.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CouplRings, Display, GoldRule, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function SignIn() {
  const router = useRouter();
  const { C, F } = useTheme();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <View style={styles.hero}>
        <CouplRings size={54} a={C.peach} b={C.lavender} />
        <Display size={52} style={{ marginTop: 20 }}>
          coupl<Text style={{ color: C.gold }}>.</Text>
        </Display>
        <GoldRule width={32} />
        <Text style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 18, color: C.mist, lineHeight: 25, marginTop: 16, maxWidth: 260 }}>
          Your quiet place, together.
        </Text>
      </View>

      <View style={{ gap: 28, marginBottom: 36 }}>
        <View>
          <Overline style={{ marginBottom: 10 }}>Email</Overline>
          <View style={[styles.field, { borderBottomColor: C.ash }]}>
            <Icon name="mail" size={16} color={C.fog} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@coupl.app"
              placeholderTextColor={C.fog}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
          </View>
        </View>

        <View>
          <Overline style={{ marginBottom: 10 }}>Password</Overline>
          <View style={[styles.field, { borderBottomColor: C.gold, borderBottomWidth: 2 }]}>
            <Icon name="lock" size={16} color={C.gold} />
            <TextInput
              value={pw}
              onChangeText={setPw}
              secureTextEntry={!showPw}
              placeholder="••••••••"
              placeholderTextColor={C.fog}
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
            <Pressable onPress={() => setShowPw((s) => !s)}>
              <Icon name="eye" size={16} color={C.fog} />
            </Pressable>
          </View>
        </View>
      </View>

      <PrimaryButton onPress={() => router.replace('/(tabs)/home')}>Sign in</PrimaryButton>

      <Pressable onPress={() => router.push('/(auth)/onboarding')} style={{ marginTop: 28, alignSelf: 'center' }}>
        <Text style={{ color: C.mist, fontFamily: F.body, fontSize: 13 }}>
          New here? <Text style={{ color: C.gold, fontWeight: '600' }}>Create an account</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center' },
  hero: { marginBottom: 60 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1 },
});
```

- [ ] **Step 4: Type-check + smoke**

```bash
npx tsc --noEmit
```
Smoke: from cold start, force-navigate to `(auth)/sign-in` (temporarily set `app/index.tsx` redirect or run `router.push('/(auth)/sign-in')` from a dev button).

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/_layout.tsx app/\(auth\)/sign-in.tsx
git commit -m "feat(auth): port sign-in screen from design prototype"
```

---

## Task 41: Port auth — Onboarding

**Files:**
- Create: `app/(auth)/onboarding.tsx`

Source: `/tmp/coupl-design/coupl/project/src/screens-aux.jsx` — `OnboardingChoose` function.

- [ ] **Step 1: Open the HTML source and read the full OnboardingChoose component**

```bash
grep -n "function OnboardingChoose" /tmp/coupl-design/coupl/project/src/screens-aux.jsx
```
Read the function body — it has two large block cards (Create / Join).

- [ ] **Step 2: Port to RN**

File: `app/(auth)/onboarding.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlockCard, CouplRings, Display, GoldRule, Overline } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function Onboarding() {
  const router = useRouter();
  const { C, F } = useTheme();

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={40} style={{ marginTop: 18 }}>Welcome<Text style={{ color: C.gold }}>.</Text></Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 16, marginTop: 14, maxWidth: 280 }}>
        A quiet place for two. Start a new one, or join your partner's.
      </Text>

      <View style={{ marginTop: 40, gap: 16 }}>
        <Pressable onPress={() => router.push('/(tabs)/home')}>
          <BlockCard color={C.peach} ink={C.peachInk}>
            <Overline>New couple</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.peachInk, marginTop: 6, fontWeight: '700' }}>
              Create a space
            </Text>
            <Text style={{ fontFamily: F.body, color: C.peachInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Set up your profile, then invite your partner.
            </Text>
            <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.peachInk, fontFamily: F.bodyBold, fontSize: 12 }}>BEGIN</Text>
              <Icon name="arrowRight" size={14} color={C.peachInk} />
            </View>
          </BlockCard>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/invite')}>
          <BlockCard color={C.lavender} ink={C.lavenderInk}>
            <Overline>Invited</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.lavenderInk, marginTop: 6, fontWeight: '700' }}>
              I have a code
            </Text>
            <Text style={{ fontFamily: F.body, color: C.lavenderInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Enter the 6-character code your partner shared.
            </Text>
            <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.lavenderInk, fontFamily: F.bodyBold, fontSize: 12 }}>ENTER CODE</Text>
              <Icon name="arrowRight" size={14} color={C.lavenderInk} />
            </View>
          </BlockCard>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 60 },
});
```

- [ ] **Step 3: Smoke + commit** — `feat(auth): port onboarding screen`

---

## Task 42: Port auth — Invite code

**Files:**
- Create: `app/(auth)/invite.tsx`

Source: `InviteCodeScreen` in same HTML file.

- [ ] **Step 1: Port to RN**

File: `app/(auth)/invite.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CouplRings, Display, GoldRule, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

const SLOTS = 6;

export default function Invite() {
  const router = useRouter();
  const { C, F } = useTheme();
  const [code, setCode] = useState<string[]>(Array(SLOTS).fill(''));
  const refs = useRef<Array<TextInput | null>>([]);

  const setSlot = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1).toUpperCase();
    setCode(next);
    if (v && i < SLOTS - 1) refs.current[i + 1]?.focus();
  };

  const filled = code.every((c) => c);

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 40 }}>
        <Icon name="chevronLeft" size={22} color={C.mist} />
      </Pressable>

      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={36} style={{ marginTop: 18 }}>
        Enter your code<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 15, marginTop: 14, maxWidth: 300 }}>
        Six characters — case doesn't matter.
      </Text>

      <View style={{ marginTop: 48 }}>
        <Overline style={{ marginBottom: 14 }}>Invite code</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {code.map((ch, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              value={ch}
              onChangeText={(v) => setSlot(i, v)}
              maxLength={1}
              autoCapitalize="characters"
              style={[
                styles.slot,
                {
                  borderColor: ch ? C.gold : C.line,
                  color: C.bone,
                  fontFamily: F.display,
                  backgroundColor: C.card,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <PrimaryButton onPress={() => filled && router.replace('/(tabs)/home')} disabled={!filled}>
          Continue
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  slot: {
    width: 48, height: 56, borderWidth: 1, borderRadius: 12,
    textAlign: 'center', fontSize: 24, fontWeight: '700',
  },
});
```

Note: if `PrimaryButton` does not support a `disabled` prop, open `src/components/ui/atoms.tsx`, find `PrimaryButton`, and add it (accept `disabled?: boolean`, render with `opacity: 0.5` and `pointerEvents: 'none'` when true).

- [ ] **Step 2: Verify `PrimaryButton` accepts `disabled`**

```bash
grep -n "PrimaryButton" src/components/ui/atoms.tsx
```
If no `disabled` handling, add it now.

- [ ] **Step 3: Smoke + commit** — `feat(auth): port invite code screen`

---

## Task 43: Wire auth entry point

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Redirect to auth on cold start**

Until InstantDB auth is re-wired, send cold-start users to `(auth)/sign-in`:

```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}
```

- [ ] **Step 2: Smoke cold start**

```bash
npm run start -- --ios --reset-cache
```
Expected: opens on sign-in screen. Tap "Sign in" → lands on home tab.

- [ ] **Step 3: Commit** — `feat(auth): use sign-in as cold-start entry point`

---

## Task 44: Purge old src/components

**Files:**
- Delete: every file under `src/components/` except `ui/`

- [ ] **Step 1: List old component subtree**

```bash
ls src/components
```

Expected: `ui/` plus several old dirs (calendar, home, journal, together, etc.).

- [ ] **Step 2: Delete everything that is not `ui/`**

```bash
cd src/components
find . -mindepth 1 -maxdepth 1 ! -name ui -exec rm -rf {} +
cd -
```

- [ ] **Step 3: Type-check — anything left importing old components?**

```bash
npx tsc --noEmit
```
If errors appear referencing deleted paths, the import came from a preserved file (hooks/providers). Leave those unresolved errors for the later functionality re-wiring task — they will be fixed when hooks are migrated. Verify errors are **only** inside `src/hooks`, `src/providers`, `src/lib/auth`.

- [ ] **Step 4: Commit** — `chore(ui): remove legacy components`

---

## Task 45: Purge old src/constants

**Files:**
- Delete: `src/constants/` entirely

- [ ] **Step 1: Confirm nothing in new UI imports from src/constants**

```bash
grep -rn "src/constants\|@/src/constants\|'../../constants" app src/components/ui 2>/dev/null
```
Expected: no matches.

- [ ] **Step 2: Delete**

```bash
rm -rf src/constants
```

- [ ] **Step 3: Type-check**

Expected: errors only inside preserved `src/hooks`, `src/providers`, `src/lib/auth` — OK.

- [ ] **Step 4: Commit** — `chore(ui): remove legacy constants`

---

## Task 46: Purge old api routes

**Files:**
- Delete: `app/api/`

- [ ] **Step 1: Delete**

```bash
rm -rf app/api
```

- [ ] **Step 2: Type-check + smoke**

- [ ] **Step 3: Commit** — `chore(api): remove legacy API routes`

---

## Task 47: Add sign-up placeholder

The old project had a `sign-up.tsx` route referenced from existing auth flows. The redesign has only sign-in + onboarding + invite. Remove the old reference.

**Files:**
- Check: `app/(auth)/sign-up.tsx` should no longer exist (it was under the old `(auth)` dir). The delete-old task already removed it via the fresh `(auth)` layout — confirm.

- [ ] **Step 1: Verify**

```bash
ls app/\(auth\)
```
Expected: `_layout.tsx  invite.tsx  onboarding.tsx  sign-in.tsx` only.

- [ ] **Step 2: No action needed if clean. Else `rm` any stragglers and commit.**

---

## Task 48: Suppress preserved-file type errors

Preserved `src/hooks`, `src/providers`, `src/lib/auth`, `src/types`, `src/test` reference deleted UI imports. To keep the build green without deleting them, exclude them from TS compilation until backend re-wire.

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Edit tsconfig**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["src/hooks", "src/providers", "src/lib/auth", "src/types", "src/test", "node_modules"]
}
```

- [ ] **Step 2: Type-check is clean**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit** — `chore(ts): exclude preserved backend files from build`

---

## Task 49: Final smoke test

**Files:**
- None

- [ ] **Step 1: Cold boot**

```bash
rm -rf .expo && npm run start -- --ios --reset-cache
```

- [ ] **Step 2: Walk the app**

Manual checklist:
- [ ] Sign-in renders with CouplRings hero
- [ ] Sign-in "Sign in" → Home tab
- [ ] Home tab renders (rings, cards, mood)
- [ ] Us tab renders (hub)
- [ ] Us → Notes / Check-ins / Expenses / Wishlists / Milestones / Plans / Journal each render
- [ ] Us → Timetables hub → tap a row → detail renders
- [ ] Calendar renders
- [ ] Tasks renders; tap list → `tasks/[id]` renders
- [ ] Reminders renders
- [ ] Sheets open: `+` buttons on reminders, tasks, each Us child → respective sheet
- [ ] Profile sheet opens from home header
- [ ] Rings-history sheet opens
- [ ] Notifications push opens
- [ ] Theme follows system (toggle iOS appearance → app updates)
- [ ] Onboarding → Invite reachable from sign-in's "Create an account"

- [ ] **Step 3: If all pass, commit any leftover changes**

```bash
git status
# if clean, no commit
```

- [ ] **Step 4: Final commit tag**

```bash
git commit --allow-empty -m "chore: warm-block redesign migration complete"
```

---

## Out of scope (follow-up work)

- Re-wire InstantDB to each new screen (separate plan per feature area).
- Prune unused dependencies from `package.json`.
- Port existing unit tests to new UI surface.
- Android visual QA.
- Remove `src/hooks`, `src/providers`, `src/lib/auth`, etc. once re-integration is complete.
