# Warm Block redesign — full app migration

## Goal

Replace entire Coupl UI with the "Warm Block" redesign. Source of truth: the RN Expo prototype at `/Users/tor/coupl-redesign`, supplemented by the HTML prototype at `/tmp/coupl-design/coupl/project/` (the original design handoff) for screens not yet ported (auth).

**Strict redesign.** Every current screen, UI component, and provider-level integration is discarded. Functionality (InstantDB, auth) is re-wired after the visual migration, one feature at a time.

## Current state to discard

- `app/(tabs)/*` — all tab screens (home, calendar, journal, more, reminders, tasks, together)
- `app/(auth)/*` — sign-in, sign-up, invite, onboarding
- `app/api/*` — calendar, daily-verse, delete-account, home
- `src/components/*` — every current component (calendar rail, bottom sheet, button, etc.)
- `src/constants/*` — colors, colors-alternatives, typography, pastels
- UI usage of InstantDB hooks (`src/hooks/*`) and providers (`src/providers/*`)

## Kept as reference (not wired to UI, not deleted)

- `instant.schema.ts`, `instant.perms.ts`
- `src/hooks/*`, `src/providers/*`, `src/lib/*`, `src/types/*`
- `src/test/*`

These live in-tree untouched so re-wiring has the schema and client already defined.

## Target structure

Adapt redesign files into main's `src/` layout (don't mirror redesign's top-level `components/` and `lib/`).

```
app/
  _layout.tsx                 redesign root (themed Stack + sheet routes)
  index.tsx                   redesign index
  notifications.tsx
  (tabs)/
    _layout.tsx               NativeTabs: home, us, calendar, tasks, reminders
    home/                     _layout.tsx, index.tsx
    us/                       _layout.tsx, index.tsx, checkins, expenses,
                              journal, milestones, notes, plans, wishlists,
                              timetables/(_layout, index, [id])
    calendar/                 _layout.tsx, index.tsx
    tasks/                    _layout.tsx, index.tsx, [id].tsx
    reminders/                _layout.tsx, index.tsx
  sheets/                     new-checkin, new-entry, new-expense, new-list,
                              new-milestone, new-note, new-plan, new-reminder,
                              new-task, new-timetable, new-timetable-item,
                              new-wish, profile, rings-history
  (auth)/                     sign-in, onboarding, invite  (ported from HTML)

src/
  lib/theme.tsx               (new) ThemeProvider — ported from coupl-redesign/lib/theme.tsx
  lib/tokens.ts               (new) warm-block tokens — ported from coupl-redesign/lib/tokens.ts
  lib/tasks-data.ts           (new) seed data
  lib/timetables-data.ts      (new) seed data
  components/ui/Icon.tsx      (replace) feather-style RN icon set
  components/ui/atoms.tsx     (new) CouplRings, BlockCard, DarkCard, Pill, Badge,
                              IconTile, PrimaryButton, RoundBtn, ProgressRing,
                              TripleRing, SectionHeader, GoldRule, WavyUnderline,
                              Display, Overline
  components/ui/Screen.tsx    (new) screen shell
  components/ui/SheetShell.tsx
  components/ui/SubHeader.tsx
  components/ui/HeaderBrand.tsx
  components/ui/HeaderLeft.tsx
  components/ui/FloatingTop.tsx
  components/ui/NavAddBtn.tsx
  components/ui/TabStackLayout.tsx
  components/ui/WhoDot.tsx
  components/ui/AddBtn.tsx
  (existing kept untouched: hooks, providers, lib/auth, types, test)
```

Paths in imported files get rewritten from `@/components/*` / `@/lib/*` → `@/src/components/ui/*` / `@/src/lib/*`. The `@/*` alias already resolves from repo root in main project (see `tsconfig.json`).

## Design tokens (locked defaults)

From `coupl-redesign/lib/tokens.ts` — no knobs.

- Theme mode: follows system (`useColorScheme`), dark default
- Dark: ink `#0E0B0A`, coal `#161210`, card `#1D1815`, bone `#F5EEE3`, gold `#E4B24A`
- Light: ink `#F5EEE3`, coal `#EDE5D8`, card `#F9F3E8`, bone `#1F1611`, gold `#B8872E`
- Pastels shared both themes: peach, lavender, butter, mint, rose, sky (plus `*Ink` on-colors)
- Feature accents: reminders `#9B8EC4`, tasks `#7BA08A`, journal `#C4977A`, wish `#D4A054`, plans `#8AAF7B`

Fonts (expo-google-fonts):
- Display: `BricolageGrotesque_700Bold`, `BricolageGrotesque_800ExtraBold`
- Body: `SpaceGrotesk_500Medium`, `SpaceGrotesk_700Bold`
- Serif (system): `Georgia`
- Mono (system): `Menlo`

No Tweaks panel. Design defaults locked: `hero=lavender`, `usVariant=editorial`, `remindersPlacement=its-own-tab`, `nativeHeader=true`, `accent=gold`.

## Routes

**Auth stack** (outside tabs)
- `(auth)/sign-in` — email + password, CouplRings hero, gold rule
- `(auth)/onboarding` — Create/Join choice
- `(auth)/invite` — 6-char invite code input

**Tabs** — iOS `NativeTabs` (native-bottom), 5 tabs
- `home` — greeting, mood, couple rings, quick actions, feature cards
- `us` — editorial hub with shared modules; children:
  - `us/notes`, `us/checkins`, `us/expenses`, `us/wishlists`,
    `us/milestones`, `us/plans`, `us/journal`, `us/timetables` (hub + `[id]` detail)
- `calendar` — mini rail + day view + events
- `tasks` — list of task lists + `[id]` detail
- `reminders` — own tab

**Sheets** — all present as `formSheet` routes on the root Stack; `sheetAllowedDetents: 'fitToContents'`, corner radius 28, `sheetGrabberVisible: true`.

**Notifications** — root stack route, transparent header.

## Components to build

All ported from `coupl-redesign/components/`:

| File | Role |
|---|---|
| `Icon.tsx` | feather icon set, RN SVG |
| `atoms.tsx` | CouplRings, BlockCard, DarkCard, Pill, Badge, IconTile, PrimaryButton, RoundBtn, ProgressRing, TripleRing, SectionHeader, GoldRule, WavyUnderline, Display, Overline, Avatar |
| `Screen.tsx` | screen shell (SafeArea + scroll + bg) |
| `SheetShell.tsx` | sheet content wrapper (header, body, footer) |
| `SubHeader.tsx` | secondary header with back + title |
| `HeaderBrand.tsx` | wordmark display header for tabs |
| `HeaderLeft.tsx` | tab header left (avatar or back) |
| `FloatingTop.tsx` | floating top-right action |
| `NavAddBtn.tsx` | nav bar "+" button |
| `TabStackLayout.tsx` | shared stack options for tab stacks |
| `WhoDot.tsx` | attribution dot (who: me/partner/us) |
| `AddBtn.tsx` | large FAB |

## Missing screens (port from HTML prototype)

Auth screens exist in `/tmp/coupl-design/coupl/project/src/screens-aux.jsx` only:
- `SignInScreen` → `app/(auth)/sign-in.tsx`
- `OnboardingChoose` → `app/(auth)/onboarding.tsx`
- `InviteCodeScreen` → `app/(auth)/invite.tsx`

HTML → RN conversion rules:
- `div` → `View`; `span` / text → `<Text>`
- inline `style={{...}}` → `StyleSheet.create` at bottom of file
- radial/linear gradients → `expo-linear-gradient`
- `input` → `TextInput`; `button` → `Pressable`
- borders with numeric sides → `border*Width` properties
- Pull colors from `useTheme().C`, fonts from `useTheme().F`
- Use redesign's atoms (`CouplRings`, `Display`, `GoldRule`, `PrimaryButton`, `Overline`) — they are the bridge

## Package.json

Keep main's existing deps additively. Verify redesign needs nothing extra — redesign uses only deps already present in main (`expo-router`, `expo-font`, bricolage-grotesque, space-grotesk, gesture-handler, safe-area-context, linear-gradient). No additions expected.

Unused-by-new-UI deps (tentap-editor, pell-rich-editor, enriched, render-html, markdown-display, gorhom/bottom-sheet, flash-list, zustand, datetimepicker, turndown, marked, react-hook-form, qrcode-svg, camera, clipboard, image-picker, blur, haptics, secure-store, symbols, web-browser, async-storage, netinfo, network, notifications) stay in `package.json` for now. Prune after functionality rewiring is complete (out of scope for this spec).

## app/_layout.tsx

Port wholesale from `coupl-redesign/app/_layout.tsx`:
- `GestureHandlerRootView` → `SafeAreaProvider` → `ThemeProvider` → themed `Stack`
- Loads the four Expo Google Font variants; blocks on `useFonts`
- `Stack.Screen` entries:
  - `(tabs)` — headerless
  - `notifications` — transparent header, title "Notifications"
  - 14 sheet routes (listed in "Routes" above) with `formSheet` presentation

Add `(auth)` entry to the stack: headerless, `contentStyle: { backgroundColor: C.ink }`.

## Migration steps (high level — detail in implementation plan)

1. Port tokens, theme, fonts. Swap `app/_layout.tsx`. Boot-smoke on iOS.
2. Port `components/ui` atoms + Icon. No screen changes yet.
3. Replace `app/(tabs)/_layout.tsx` with 5-tab NativeTabs.
4. Port screens in order: home → us (hub) → us children → tasks + tasks/[id] → calendar → reminders → notifications.
5. Port sheet routes (all 14).
6. Port auth screens from HTML design.
7. Copy seed data (`lib/tasks-data.ts`, `lib/timetables-data.ts`) into `src/lib/`.
8. Delete old `src/components/*` and `src/constants/*` tree.
9. Smoke test on iOS: every route reachable, every sheet opens, theme toggle works.

## Out of scope

- Re-wiring InstantDB (happens after this spec, feature-by-feature).
- Pruning unused deps.
- Deleting preserved reference files (schema, hooks, providers).
- Android/web parity beyond what redesign already offers.
- New features beyond Timetables (which is already in redesign).
- Tests for new UI (existing vitest config stays; no new tests added here).

## Verification

After migration completes:
- `npm run start -- --ios` boots
- Each tab renders without runtime errors
- Each sheet route opens from its trigger
- Theme follows system colorScheme
- Fonts load (no Times New Roman fallback)
- Navigation between tabs, sheets, stack detail screens all work
- Auth screens reachable (not wired to real auth yet)
