# Coupl redesign spec

Audit and porting spec for the "Warm Block" redesign.

- **Canonical design source**: `docs/design-reference/project/Coupl.html` (and `docs/design-reference/project/src/*.jsx` it imports). Pulled from the Claude Design handoff URL, extracted from the tar.gz bundle.
- **Reference RN port (scaffold)**: `/Users/tor/coupl-redesign/` — a bare Expo Router scaffold that implements ~12 shared components + ~35 screens/sheets from the design source. Confirms intent for the port.
- **Target codebase**: `/Users/tor/Documents/projects/coupl/` (this worktree: `/Users/tor/.cline/worktrees/ec350/coupl/`). Has a superset of the scaffold (extra UI primitives, auth flow, InstantDB bindings, `isSolo` mode, GlassView liquid-glass layer, sheets registered as `formSheet` in the root stack). This is where the redesign must land.

> **Header exception — read this first.** The target already has a per-screen **Stack header** using `HeaderBrand` (centered `TITLE.` + eyebrow) + `HeaderLeft` (bell on home / chevron elsewhere) + `headerRight` (avatar stack or `NavAddBtn`). Every tab subnavigator (`app/(tabs)/*/[tab]/_layout.tsx`) wires this via `<Stack.Screen options={{ headerTitle: () => <HeaderBrand …/>, headerLeft, headerRight }}/>`. **This pattern stays.** Nowhere in the redesign should the in-body editorial `ScreenHeader` block (giant `TASKS.` title with wavy underline) from the design source replace the existing Stack header. When porting a Coupl.html screen that renders its own `ScreenHeader`/`SubScreenHeader`/`NativeHeader`, strip that block and start the screen body at the first hero card. See §6 for details and a full list of call sites.

---

## 1. Coupl.html → RN screen mapping

`Coupl.html` is a showcase stage: it renders ~36 iPhone-frame previews that share the same component library. The real app is a subset of those frames wired into an Expo Router 5-tab navigator. Mapping:

| # | Coupl.html label | Source file · component | Target route(s) |
|---|---|---|---|
| 01 | Sign in | `screens-aux.jsx` · `SignInScreen` | `app/(auth)/sign-in.tsx` |
| 02 | Onboarding choose | `screens-aux.jsx` · `OnboardingChoose` | `app/(auth)/onboarding.tsx` |
| 03 | Invite code display | `screens-aux.jsx` · `InviteCodeScreen` | `app/(auth)/invite-code.tsx` |
| — | Invite (enter code) | *derivative of 02/03, not a Coupl.html frame* | `app/(auth)/invite.tsx` |
| 04 | Home | `screen-home.jsx` · `HomeScreen` | `app/(tabs)/home/index.tsx` |
| 05 | Us · hub (default = editorial) | `screens-us-redesigns.jsx` · `TogetherEditorial` | `app/(tabs)/us/index.tsx` |
| 06 | Tasks | `screens.jsx` · `TasksScreen` | `app/(tabs)/tasks/index.tsx` |
| 07 | Journal | `screens.jsx` · `JournalScreen` | `app/(tabs)/us/journal.tsx` *(lives under Us per `remindersPlacement=us-child` intent)* |
| 08 | Calendar | `screens-together.jsx` · `CalendarScreen` | `app/(tabs)/calendar/index.tsx` |
| 09 | Reminders | `screens.jsx` · `RemindersScreen` | `app/(tabs)/reminders/index.tsx` |
| 10 | Task list detail | `screens.jsx` · `TaskListDetail` | `app/(tabs)/tasks/[listId].tsx` (note: redesign scaffold uses `[id].tsx`) |
| 11 | Profile · full page | `screens.jsx` · `MoreScreen` | `app/sheets/profile.tsx` *(target presents profile as a sheet, not a tab)* |
| 12 | Tab bar showcase | `Coupl.html` · `TabBarShowcase` / `MiniTabs` | `app/(tabs)/_layout.tsx` via `NativeTabs` |
| US-A/B/C | Three Us variants | `screens-us-redesigns.jsx` · `TogetherEditorial` / `TogetherPoetic` / `TogetherScrapbook` | target locks on **Editorial** (already implemented) |
| 13 | Love notes | `screens-together.jsx` · `LoveNotesScreen` | `app/(tabs)/us/notes.tsx` |
| 14 | Check-ins | `screens-together.jsx` · `CheckinsScreen` | `app/(tabs)/us/checkins.tsx` |
| 15 | Expenses | `screens-together.jsx` · `ExpensesScreen` | `app/(tabs)/us/expenses.tsx` |
| 16 | Wishlists | `screens-together.jsx` · `WishlistsScreen` | `app/(tabs)/us/wishlists.tsx` |
| 17 | Milestones | `screens-together.jsx` · `MilestonesScreen` | `app/(tabs)/us/milestones.tsx` |
| 18 | Plans | `screens-together.jsx` · `PlansScreen` | `app/(tabs)/us/plans.tsx` |
| 19 | New reminder sheet | `screens-aux.jsx` · `CreateReminderSheet` | `app/sheets/new-reminder.tsx` |
| 20 | New journal entry sheet | `screens-aux.jsx` · `CreateEntrySheet` | `app/sheets/new-entry.tsx` |
| 21 | New task list sheet | `screens-aux.jsx` · `CreateListSheet` | `app/sheets/new-list.tsx` |
| 22 | Love note sheet | `sheets-us.jsx` · `CreateNoteSheet` | `app/sheets/new-note.tsx` |
| 23 | Check-in sheet | `sheets-us.jsx` · `CheckinSheet` | `app/sheets/new-checkin.tsx` |
| 24 | Expense sheet | `sheets-us.jsx` · `ExpenseSheet` | `app/sheets/new-expense.tsx` |
| 25 | Wishlist sheet | `sheets-us.jsx` · `WishlistSheet` | `app/sheets/new-wish.tsx` |
| 26 | Milestone sheet | `sheets-us.jsx` · `MilestoneSheet` | `app/sheets/new-milestone.tsx` |
| 27 | Plan sheet | `sheets-us.jsx` · `PlanSheet` | `app/sheets/new-plan.tsx` |
| 28 | Profile & settings sheet | `sheets-us.jsx` · `ProfileSheet` | `app/sheets/profile.tsx` |
| 29 | Timetables hub | `screens-timetables.jsx` · `TimetablesScreen` | `app/(tabs)/us/timetables/index.tsx` |
| 30/31/32/33 | Timetable detail · empty / grid / list / timeline | `screens-timetable-detail.jsx` · `TimetableDetailScreen` | `app/(tabs)/us/timetables/[id].tsx` |
| 34 | New timetable sheet | `sheets-timetables.jsx` · `CreateTimetableSheet` | `app/sheets/new-timetable.tsx` |
| 35 | New item sheet | `sheets-timetables.jsx` · `AddTimetableItemSheet` | `app/sheets/new-timetable-item.tsx` |
| 36 | Time picker sheet | `sheets-timetables.jsx` · `TimePickerSheet` | *no target route; inlined in `new-timetable-item.tsx`* |
| — | Task sheet | *not in Coupl.html; target-only* | `app/sheets/new-task.tsx` |
| — | Rings history | *not in Coupl.html; target-only* | `app/sheets/rings-history.tsx` |
| — | Notifications | `Coupl.html` root stack reserves the slot; no design frame | `app/notifications.tsx` |

Delta vs Coupl.html:

- The Coupl.html TweaksPanel lets you pick `remindersPlacement: tasks-filter | home-child | us-child` and a `usVariant` and `nativeHeader`. **Target locks on**: `remindersPlacement=tasks-filter` *(Reminders is its own tab, shown in `(tabs)/reminders`, not a child of Us)*, `usVariant=editorial`, and a native-like Stack header (see §6). Do not port the TweaksPanel.
- Coupl.html shows `MoreScreen` as a full tab (frame 11). Target presents profile & settings as **Sheet 28** (`profile.tsx`) — use `ProfileSheet` layout, not `MoreScreen`.
- Coupl.html has no Auth group; target has a four-screen auth flow. Auth maps to design frames 01–03 plus one synthesis (`invite.tsx` — paste-a-code screen, modeled on `InviteCodeScreen` inverted).
- `[listId]` vs `[id]`: redesign scaffold uses `[id]`, target uses `[listId]`. Keep `[listId]`.

---

## 2. Component inventory — `/Users/tor/coupl-redesign/components/`

Twelve components, plus a separate `atoms.tsx` module exporting primitives. All use `useTheme()` from `lib/theme.ts` (returns `{ C, F, mode }`).

### `atoms.tsx` (primitives module — 803 loc)

Not a single component — the grab-bag that every other file imports from.

| Export | Props | Visual |
|---|---|---|
| `Avatar` | `{letter?, size=36, bg?, color?, border?, style?}` | Circle, initial letter in Bricolage display. Optional 2px ring (for overlapping pairs). |
| `Overline` | `{children, color?, style?}` | 10px Space Grotesk 700, letterSpacing 1.4, uppercase. Default color `C.fog`. |
| `Display` | `{children, size=34, color?, style?}` | Bricolage 800, lineHeight `size*0.95`, letterSpacing −1. The big-type workhorse. |
| `BlockCard` | `{bg?, ink?, children, style?, onPress?}` | 22-radius pastel slab. If `onPress`, wraps in `Pressable`. |
| `DarkCard` | `{children, style?, onPress?, border=true, padding=18}` | 22-radius `C.card` with 1px `C.line` border. |
| `Pill` | `{children, bg?, color?, active=false, activeBg?, activeColor?, onPress?, size?, style?}` | 999-radius button. Inactive = outlined; active = filled (`activeBg`). 12px uppercase 600. |
| `Badge` | `{children, bg?, color?, style?}` | Smaller pill, no press. `alignSelf: 'flex-start'`. |
| `IconTile` | `{icon, bg?, color?, size=36, radius=11, iconSize?}` | Tinted rounded square with a centered stroke icon. |
| `PrimaryButton` | `{children, onPress?, disabled?, icon?, style?}` | 54-high gold pill with Bricolage 16 uppercase label. Optional leading icon. Disabled = `C.cardHi` bg, `C.fog` text. |
| `RoundBtn` | `{icon, onPress?, bg?, color?, size=40, border?, iconSize?, style?}` | Circle with stroke icon. Pass `border={null}` to drop the outline (used for gold add-btn). |
| `ProgressRing` | `{size=90, stroke=8, value=0.82, colors?, bg?, label?, labelColor?}` | SVG ring with linear-gradient stroke. Rotated −90°. Optional absolute-centered Bricolage label. |
| `TripleRing` | `{size=96, values=[0.82,0.65,0.9], colors?, bg?, stroke?, gap?}` | Three concentric rings on shared 2πr math. Used for Home "Connect / Shared / Present" hero. |
| `SectionHeader` | `{label, action?}` | `Overline` left + optional right node. 4px horizontal padding, 12px bottom margin. |
| `WavyUnderline` | `{width=130, color?, opacity=0.75}` | Quadratic-Bézier 8-high `<Svg>`. Signature accent under display titles. |
| `ScreenHeader` | `{eyebrow?, title, accent?, meta?, action?, underlineColor?}` | Editorial block: Overline + 42-big Display + 96-wide WavyUnderline + optional meta + right action. **In the target, this is replaced by the Stack header (HeaderBrand) — don't use in screens.** See §6. |
| `StickyDate` | `{label, count?, color?, collapsible?, open?, onToggle?}` | Row with color dot + 10px 800-weight label. Divider under. When `collapsible`, taps toggle. |
| `DateSectioned<T>` | `{sections: [{label,color?,items}], maxOpen=3, renderItem, defaultColor?}` | Smart-sorted bucketed list. Past `maxOpen` sections collapse behind a "Show N more" dashed card. Used by Reminders, Task list detail, Plans. |
| `CouplRings` | `{size=36, opacity=1, a?, b?}` | Two overlapping circle outlines — the brand mark. 40×40 viewBox, stroke-width 2. |

### `AddBtn.tsx` (23 loc)

Gold circular 38×38 button with a white-ink `plus` icon. Hard-coded size. Used as a floating/header create action.

- Props: `{onPress?}`
- Visual: `backgroundColor: C.gold`, 19-radius, `Icon plus 18 color=C.peachInk strokeWidth=2.5`.

### `HeaderBrand.tsx` (29 loc) — **keep**

Renders the centered `TITLE.` wordmark used inside a Stack `headerTitle`.

- Props: `{eyebrow?, title, accent? (default C.gold), size=30}`
- Visual: centered block. Eyebrow (10px Overline) + `<Display size={size}>TITLE<span color=accent>.</span></Display>`.

### `HeaderLeft.tsx` (30 loc) — **keep**

Router-aware left header button.

- Props: `{mode: 'home' | 'back'}`
- Behavior: `mode=home` → bell icon, pushes `/notifications`. `mode=back` → `chevronLeft` if `router.canGoBack()` else `home` icon replacing to `/home`.
- Visual: 22-size stroke icon, `color=C.bone`, 4-px padding, 12-px hitSlop.

### `NavAddBtn.tsx` (23 loc) — **keep**

Header-right add button that routes to a sheet.

- Props: `{href: string, icon='plus'}`
- Calls `router.push(href as any)`. Same visual as `HeaderLeft` (22-size stroke, bone color, 4px padding).

### `FloatingTop.tsx` (21 loc)

Absolutely-positioned top-right container for floating chips.

- Props: `{children}`
- Layout: `position: absolute, top: STATUS_BAR + 6, right: 16, zIndex: 10, pointerEvents: box-none`.
- Target has its own richer `FloatingTop` with similar API; target's version wins.

### `Icon.tsx` (365 loc)

Feather-port — inline SVG paths for ~70 icons in one file. Type `IconName = keyof typeof paths`.

- Props: `{name: IconName, size=20, color='currentColor', strokeWidth=2}`
- All icons use `fill=none`, `strokeLinecap=round`, `strokeLinejoin=round`.
- Target's Icon is a superset — use target's.

### `Screen.tsx` (64 loc)

Universal screen wrapper.

- Props: `{children, style?, scroll=true, bottom=110, topPad?, underHeader=false}`
- Scroll mode: `ScrollView` with `contentInsetAdjustmentBehavior=automatic` so content offsets under the transparent native header. `paddingHorizontal:18`, `paddingBottom:110`, `backgroundColor:C.ink`.
- Non-scroll: `View` with safe-area top padding.
- **`underHeader=true`** flips to manual `paddingTop: STATUS_BAR + tp`, used when the screen draws its own pastel hero that must go under the translucent header.

### `SheetShell.tsx` (51 loc)

Shared sheet-body wrapper (used for every `sheets/*.tsx`).

- Props: `{eyebrow?, eyebrowColor?, title?, children, footer?}`
- Layout: `ScrollView` on `C.coal`, top-row Overline + Display + close `RoundBtn icon=x` → `router.back()`. Optional footer pinned inside scroll content with 28-top margin.
- Visual: 20-px padding, 24 bottom, keyboard persists taps, no scroll indicator, bounce disabled.

### `SubHeader.tsx` (71 loc)

In-body sub-screen header (legacy pre-`nativeHeader` path). Back circle + eyebrow + 24-big title + optional right node. Target has the same file verbatim; **redesign screens that use this should be converted to Stack header when ported** (see §6).

### `TabStackLayout.tsx` (43 loc)

Shared Stack wrapper for a tab whose root is `index.tsx`.

- Props: `{eyebrow?, title, accent?, headerRight?: ()=>Node}`
- Wires a transparent Stack with one `<Stack.Screen name="index"/>` whose `headerTitle = <HeaderBrand .../>`, `headerLeft = <HeaderLeft mode="back"/>`, `headerRight` = prop.
- Used by Reminders and Calendar in the target. Tasks/Us/Home don't use it — they define per-Stack options inline (Us needs per-child options).

### `WhoDot.tsx` (52 loc)

Paired-avatar chip for "who owns this?" metadata. Supports `who: 'me' | 'sofia' | 'both'`. For `both` renders two 18-sized overlapping avatars with a 5-overlap and a 1.5-border against `C.ink`. For solo, renders one. Hard-codes M/S initials and peach/lavender colors.

- Props: `{who: Who, size=18, borderColor?}`

---

## 3. Design tokens

Tokens match 1:1 between `src/tokens.jsx` (design), `/Users/tor/coupl-redesign/lib/theme` (scaffold), and `src/lib/tokens.ts` (target). **No drift** — any porting should read from the target's `tokens.ts` directly.

### Colors

**Dark (default)**

```
ink       #0E0B0A  warm near-black bg
coal      #161210  elevated surface (sheet bg)
card      #1D1815  card
cardHi    #262019  hover / active card
line      #2B241E  borders
lineHi    #3A322A  emphasized borders
bone      #F5EEE3  primary text
mist      #B3A89A  secondary text
fog       #80746A  tertiary text
ash       #5A5048  quaternary / inactive
gold      #E4B24A  brand anchor
goldDim   #C99836  gold pressed
goldSoft  rgba(228,178,74,0.14)  tinted gold fill
```

**Light**

```
ink       #F5EEE3  warm cream bg
coal      #EDE5D8
card      #F9F3E8
cardHi    #FFF9EE
line      #D9CFBE  warm taupe
lineHi    #C5B8A2
bone      #1F1611  near-black warm
mist      #5A4B3E
fog       #86766A
ash       #A59684
gold      #B8872E  deeper for cream contrast
goldDim   #956912
goldSoft  rgba(184,135,46,0.12)
```

**Pastels (shared, theme-invariant)**

```
peach      #F4A68C   peachInk   #3A1F14
lavender   #B8A8E8   lavenderInk #1F1635
butter     #F2D86A   butterInk  #3A2E08
mint       #A8D8B9   mintInk    #0F2C1A
rose       #D89BA8   roseInk    #3A1520
sky        #9FC4DC   skyInk     #0E2230
```

**Feature accents** (for outlines / header accents): `reminders #9B8EC4`, `tasks #7BA08A`, `journal #C4977A`, `wish #D4A054`, `plans #8AAF7B`.

**States**: `error #E07A68`, `success #9CC58B`.

### Typography

```
display     Bricolage Grotesque 700
displayBold Bricolage Grotesque 800
body        Space Grotesk 500
bodyBold    Space Grotesk 700
serif       Georgia  (journal quotes, love notes)
mono        Menlo / JetBrains Mono  (invite code, numbers)
```

Scale (observed): 9/10/11 overline & labels · 12/13 body · 14/15 card body · 16 primary-button · 18–22 card title · 24–28 sub-screen title · **34 native-header title** · 38–42 display title · 54 stat hero.

Letter-spacing: overline 1.2–1.6, display −0.6 to −1.4 (tighter at larger sizes).

### Spacing

No formal scale — screens use 10/12/14/16/18/20/22/24/28 ad hoc. Recurring: screen padding 18, card padding 18 (small) / 20 (medium) / 22 (large), card gaps 10–14, row vertical 14, sheet padding 20/20/30.

### Radii

`6` (date chip), `8` (inner tiles), `10/11/12` (icon tiles), `14` (pills in card), `16/18` (list rows), `22` (cards — canonical), `24/26/28` (hero cards, sheet top), `999` (pills, buttons, avatars).

### Shadows

Minimal. The gold FAB used in the Us-child sub-screens has `boxShadow: 0 10px 24px rgba(228,178,74,0.35)`. Everything else relies on color contrast + borders. iOS-frame chrome in Coupl.html uses `0 40px 80px rgba(0,0,0,0.45)` for the phone frame — not app-level.

### Blur / glass

`StickyDate` uses `backdropFilter: blur(10px)` + `C.ink + E6` (90% alpha) as a sticky backdrop. Target's `GlassView` family (`GlassView`, `GlassRow`, `GlassSection`) extends this with iOS 26 liquid-glass materials — these are target-only, not in the design source.

---

## 4. Screen-by-screen diff

Each entry: **Design intent → current target state → gaps to close.** "Current state" verified against the worktree files listed in §1.

### 4.1 Home — `app/(tabs)/home/index.tsx`

- **Design intent (`screen-home.jsx`, `HomeScreen`)**: Stack header with HeaderBrand ("Good morning" / "MATTIA") + bell + overlapping avatars. Body order: date pill (THU · 17 APR · DAY 847 TOGETHER) → peach hero `TripleRing` card (CRUSH IT / 82%) → mood chip row → `remindersPlacement=home-child` inline card *(skip)* → week calendar → verse card (gold rule + Georgia italic) → today timeline (`SectionHeader` + dotted vertical rail) → "Explore together" chips.
- **Current state**: implements the intent, including `TripleRing` 150/12/3 bigger than design (108), and wires `rings-history` sheet on press. Uses `Screen`, `BlockCard`, `DarkCard`, `Pill`, `IconTile`, `Avatar`, `Overline`, `Display`, `SectionHeader`, `TripleRing`, `Icon`.
- **Gaps**: hero has no `+12% WK Badge` in current target (design shows one top-right) — add `<Badge>+12% WK</Badge>` back. Solo-aware tweak: `HomeLayout` already hides Sofia avatar when `isSolo` — keep. No functional diffs otherwise.

### 4.2 Calendar — `app/(tabs)/calendar/index.tsx`

- **Design intent (`screens-together.jsx`, `CalendarScreen`)**: Butter month-overview hero ("8 events" with ghost-circle decoration) → week strip with selected-day gold pill → "THURSDAY · 17 APR" overline + event count → events rail (56-wide time column + pastel full-slab event card with loc + `cat` micro-label) → "TOMORROW" sectioner → single card for next-day milestone.
- **Current state**: already implements the pattern; uses `TabStackLayout` with eyebrow `April 2026` and title `CAL` accent gold.
- **Gaps**: the Stack header currently doesn't expose a month chevron; design has no such control either, fine. Check that events rail shrinks the `cat` label to 9-px 700 on the card — target should match.

### 4.3 Tasks — `app/(tabs)/tasks/index.tsx`

- **Design intent (`screens.jsx`, `TasksScreen`)**: mint "Getting done N/M" stat card with `ProgressRing` 80 → segmented Tasks/Reminders *(only when `remindersPlacement=tasks-filter` — this is the target's setting)* → filter pill row (All · Mine · Sofia's · Shared · Travel · Home · Date · Work) → 2-col pastel `TaskListCard` grid with icon tile, 18-big display name, 4-px progress bar, 10-px 800-weight count + % label.
- **Current state**: mint hero + filter row implemented. `TASK_LISTS` comes from `src/lib/tasks-data`. Uses `Display`, `Overline`, `Pill`, `ProgressRing`, `Screen`.
- **Gaps**: segmented Tasks/Reminders toggle is **not wired** in target (Reminders is its own tab, no toggle needed here) — leave out. Inline add button used in design's TaskListCard header-right is handled by `NavAddBtn` in the Stack header — already correct.

### 4.4 Task list detail — `app/(tabs)/tasks/[listId].tsx`

- **Design intent (`TaskListDetail`)**: custom header band on `C.coal` with back-round-btn + pill tag + plus-round-btn, `Display 34 NAME`, 4-px progress bar with live %, then `DateSectioned` buckets (Overdue · Today · Tomorrow · This week · May · Jun · Later) of task rows (22-radius check circle + title + `C.cardHi` due chip + priority dot), completed collapsed at 0.55 opacity, sticky `quickAdd` input pill at bottom with arrow-up send.
- **Current state**: 261 loc — needs verification against full pattern. Route uses `[listId]` as source of truth.
- **Gaps** (verify during port): the design's coal-band header conflicts with the Stack header — in the target, use the Stack header (title = the list's name via dynamic `HeaderBrand`) and move progress bar + pill into the screen body under it. Drop the coal-band treatment. Keep the bottom `quickAdd` pill.

### 4.5 Reminders — `app/(tabs)/reminders/index.tsx`

- **Design intent (`RemindersScreen`)**: lavender summary block (big `N` active + done/overdue line + stacked segmented bar with DONE/OPEN/SNOOZED/PARTNER labels) → filter pills (All · Mine · Sofia's · Shared · Overdue, active fill = `C.reminders`) → `DateSectioned` of `ReminderRow` (`ReminderRow`: round check btn, title, clock+when, who overline, priority dot — `med=C.butter`, `high=C.error`, `low=C.ash`) → completed collapsible group.
- **Current state**: implemented, 290 loc. Uses `TabStackLayout` for the Stack header.
- **Gaps**: check that the summary block renders the 4-segment bar with correct widths (40/25/20/15 percent slices) and the DONE/OPEN/SNOOZED/PARTNER labels underneath — these are easy to drop during the port.

### 4.6 Us hub — `app/(tabs)/us/index.tsx`

- **Design intent — Editorial variant (`TogetherEditorial`)**: Vol.III issue masthead + big `US.` wordmark + border rule → "MOOD · TODAY" overline + dual peach/lavender mood slab (each with fake sleep bars) → "86% IN SYNC · 4-DAY STREAK" kicker → Georgia-italic quote card with big opening quotemark → then the shared-spaces grid (asymmetric: 1 big + 2 flats in col-2, then 2×2 standard cards, then Timetables + Journal).
- **Current state (verified)**: target already implements the editorial layout with `MoodSlab` (commented out — needs restoring) and `FeatureCard` variants `big`/`flat`/`wide`. The Us header is supplied by `UsLayout` Stack screen with `HeaderBrand eyebrow="Day 847 together" title={spaceLabel}` where `spaceLabel = isSolo ? 'ME' : 'US'`.
- **Gaps**: (1) the commented-out `MoodSlab` pair + "4-DAY STREAK" kicker and the quote-of-the-day card are currently excluded — decide whether to restore; they're the editorial variant's signature. (2) `features[]` currently uses `Journal` as the 8th feature — the design puts Journal in this slot too (via `us-child` placement), matches. (3) "On this day" section at the bottom is a `{/* comment */}` stub — the design doesn't actually render one, leave empty or drop.

### 4.7 Us · Love notes — `app/(tabs)/us/notes.tsx`

- **Design intent (`LoveNotesScreen`)**: Stack header eyebrow `US · NOTES` title `Love notes` accent rose → rose featured-note slab with "FROM SOFIA · 7:14 AM" overline, Georgia-italic 19 body, "♥ REACT" + "REPLY" black-tint pills → "EARLIER" overline → chat-bubble history (me bubbles right `C.butterInk` with `C.butter` text, sofia bubbles left `C.card` bordered, each with 9-px timestamp).
- **Current state**: 136 loc. Uses `Screen`.
- **Gaps**: verify chat bubble rounding (me: br=6 bl=18, sofia: br=18 bl=6) — part of the editorial voice.

### 4.8 Us · Check-ins — `app/(tabs)/us/checkins.tsx`

- **Design intent (`CheckinsScreen`)**: butter "IN SYNC" hero (54-big `86%`, descriptor, 6-px sync bar) → "THIS WEEK" overline → dark-card week grid (7 columns Mon–Sun, 2 rows: you peach above, sofia lavender below, null days = dashed empty circles) → "TODAY · NOT CHECKED IN YET" → full-width gold CTA button "Share how today feels".
- **Current state**: to port. Route exists.
- **Gaps**: the full implementation is in `screens-together.jsx` (L266–335) — copy verbatim, swap HTML/CSS for RN primitives.

### 4.9 Us · Expenses — `app/(tabs)/us/expenses.tsx`

- **Design intent (`ExpensesScreen`)**: mint "SOFIA OWES YOU" hero (56-big `€42.25` with opacity-.6 decimals), split progress bar with YOU/SOFIA totals → "RECENT" overline → list rows (40 icon-tile mint-ink-bg, title + day/payer/split overline, 16-big amount right-aligned).
- **Current state**: 181 loc. Implemented.
- **Gaps**: verify icon is `dollarSign` (from design) — target's Icon module should have it.

### 4.10 Us · Wishlists — `app/(tabs)/us/wishlists.tsx`

- **Design intent (`WishlistsScreen`)**: lavender "ON YOUR LISTS" stat card with three big numbers (14/3/€1.4k) → horizontal filter pill row (ALL · SOFIA'S · MINE · SHARED · CLAIMED) → list rows (42 lavender-ink-bg icon tile, title with line-through if claimed, who/tag overline, right-aligned 14-big price + "CLAIMED" mint badge).
- **Current state**: implemented.
- **Gaps**: verify 0.5 opacity on claimed rows.

### 4.11 Us · Milestones — `app/(tabs)/us/milestones.tsx`

- **Design intent (`MilestonesScreen`)**: peach "NEXT · IN 1 DAY" hero with giant ghost `3` (fontSize 140, opacity 0.06) as background, "Three years." display heading (two-line), Georgia-italic quote → year-stamped timeline list (50-wide year column + pastel card per event, future events dashed outline + 0.55 opacity).
- **Current state**: 145 loc. Implemented.
- **Gaps**: verify ghost numeral positioning (`top: -10, right: -10`) — easy to miss in RN without `overflow: hidden`.

### 4.12 Us · Plans — `app/(tabs)/us/plans.tsx`

- **Design intent (`PlansScreen`)**: uses `SubScreenHeader` in-body (design scaffold path) + sky "Things we're building" stat hero with `N plans` + tasks-done descriptor + avg progress bar + bucket-count footer → `DateSectioned` buckets (This month · Ongoing · Later this year · Someday) of plan cards (pastel slab, tag overline, 22-big title, sub, icon tile top-right, 5-px progress bar, count + %).
- **Current state**: 248 loc. Implemented.
- **Gaps**: design uses `SubScreenHeader` but in target this is the Stack header — **drop the `SubScreenHeader` call** and start body at the sky hero card. Same pattern for all Us-child screens.

### 4.13 Us · Journal — `app/(tabs)/us/journal.tsx`

- **Design intent (`JournalScreen`)**: butter featured-quote card (quotemark decoration top-right at 0.3 alpha, "THIS WEEK · 4 entries" overline, Georgia italic body with em-width constraint, attribution line) → All/Shared/Private segmented tab bar (active underline = `C.journal`) → entry cards (10-px date + optional lock icon for private, mood tile top-right, optional 18-big display title, 2-line clamp body; Sofia's entries get left `C.gold` 3-px border + Sofia avatar footer).
- **Current state**: route exists under Us. Design is complete.
- **Gaps**: verify 2-line clamp translates to RN (`numberOfLines={2}` on `<Text>`).

### 4.14 Us · Timetables hub — `app/(tabs)/us/timetables/index.tsx`

- **Design intent (`TimetablesScreen`)**: hub header with back + title + `eye` debug toggle (show empty state) + gold plus-btn → empty state: pastel slab "no rhythms yet" + PrimaryButton → populated: peach stats hero (N rhythms, next-in-X hours) → list of cards: each card = `{title, share, items, next}` with `share` badge (shared = gold-soft · partner = lavender-soft "SOFIA'S" · solo = sky-soft "SOLO"), tapping opens detail.
- **Current state**: routes exist — scaffold only per directory listing.
- **Gaps**: hub needs the stats hero + template filter logic per `TEMPLATES` list (meals/workout/study/routine/sleep/custom).

### 4.15 Us · Timetable detail — `app/(tabs)/us/timetables/[id].tsx`

- **Design intent (`TimetableDetailScreen`, `screens-timetable-detail.jsx`)**: peach-ink hero band with timetable title + template icon tile + "21 items · 4 days · 18 hrs" stat row → segmented 3-way layout control (`Grid · List · Timeline`) → each layout renders `DEMO_ITEMS` differently:
  - **Grid**: 7-col day columns showing dotted hour lines + stacked card per item colored by meal type.
  - **List**: date-sectioned by day, full-width item rows.
  - **Timeline**: single vertical day with hour rail + absolute-positioned items.
- **Current state**: file exists, likely stub.
- **Gaps**: full porting needed. Layout-switcher segmented is the only new pattern — use target's `SegmentedControl`.

### 4.15½ Sheets overview

All sheets in the target are registered as `presentation: 'formSheet'` in `app/_layout.tsx` with `sheetGrabberVisible: true, sheetCornerRadius: 28, sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.coal }`. This replaces the design's custom-animated `Sheet` modal (CSS translateY). **Use the system form-sheet chrome**, not a custom backdrop/transform. All sheet bodies should use `SheetShell` for the top close-btn + eyebrow/title row.

### 4.16 Sheet · `app/sheets/new-checkin.tsx` (Checkin sheet)

- **Design intent (`sheets-us.jsx` · `CheckinSheet`)**: mood slab row (5 options), energy slider, note textarea, save.
- **Gaps**: verify all 5 moods + energy slider are present. Uses butter accent.

### 4.17 Sheet · `app/sheets/new-entry.tsx` (Create journal entry)

- **Design intent (`CreateEntrySheet`)**: date overline → big 26 Display title input → gold 2-px underline → Georgia textarea body (italic placeholder) → "How does it feel?" mood chip row → private toggle (44×26 pill switch, active `C.lavender`).
- **Gaps**: verify the private toggle geometry (20×20 thumb, 13-radius track, 0.2s ease transition).

### 4.18 Sheet · `app/sheets/new-expense.tsx` (Expense sheet)

- **Design intent (`ExpenseSheet`)**: big amount input (Bricolage 48 with € prefix and cents dimmed), split row (50/50 · Me paid · Sofia paid segmented), category pill row, date row with calendar + clock chips.
- **Gaps**: amount formatting (live € parsing) + split segmented.

### 4.19 Sheet · `app/sheets/new-list.tsx` (Create task list)

- **Design intent (`CreateListSheet`)**: list-name gold-underlined input → icon grid (10 icon tiles, 44-sized, active = `color+33` bg + color border) → color swatch grid (8 pastel + gold + journal, 34-circle, active = 3-px `rgba(255,255,255,0.3)` ring) → gold "Create list" primary btn.
- **Gaps**: verify selected-swatch ring.

### 4.20 Sheet · `app/sheets/new-milestone.tsx` (Milestone sheet)

- **Design intent (`MilestoneSheet`)**: title input → date picker row (month/year) → color accent picker → optional quote input (Georgia).
- **Gaps**: full implementation.

### 4.21 Sheet · `app/sheets/new-note.tsx` (Love note sheet)

- **Design intent (`CreateNoteSheet`)**: recipient header (`For Sofia`), big Georgia textarea inside `C.card` bordered box with vibe icon decoration top-right at 0.4 alpha → vibe pill row (Sweet·Funny·Thanks·Sorry·Proud each with colored icon).
- **Gaps**: full implementation. Rose accent.

### 4.22 Sheet · `app/sheets/new-plan.tsx` (Plan sheet)

- **Design intent (`PlanSheet`)**: title + sub-description → target date / bucket picker (This month · Ongoing · Later this year · Someday) → icon tile picker → color picker → optional first-task quick-add.
- **Gaps**: full.

### 4.23 Sheet · `app/sheets/new-reminder.tsx` (New reminder)

- **Design intent (`CreateReminderSheet`)**: title input (gold underline when filled) → notes textarea → When row (two chips: calendar · clock) → Priority segmented (3 options with dot-count indicator: low=1 dot, med=2 dots, high=3 dots, active = `C.reminders` tint) → Category pill row → Repeat pill row → Assign to segmented (Both/Me/Sofia).
- **Current state**: 226 loc, implemented.
- **Gaps**: verify priority dot-count indicator — that's the "comments addressed" fix, must be present.

### 4.24 Sheet · `app/sheets/new-task.tsx` (New task)

- **Design intent**: **not a Coupl.html frame.** Target-only. Pattern: mirror `CreateReminderSheet` with the list-color accent and no repeat/category.
- **Current state**: 148 loc. Ensure it uses `SheetShell`.

### 4.25 Sheet · `app/sheets/new-timetable.tsx` (New timetable)

- **Design intent (`CreateTimetableSheet`, `sheets-timetables.jsx`)**: title input → template grid (6 `TEMPLATES` cards: Meals·Workout·Study·Routine·Sleep·Blank, each with color + icon + sample-items line) → share selector (Solo · Shared · Partner, with `shareBadge` styling).
- **Gaps**: full.

### 4.26 Sheet · `app/sheets/new-timetable-item.tsx` (New timetable item + inline time picker)

- **Design intent (`AddTimetableItemSheet` + `TimePickerSheet`)**: title + category pill row → day pickers (7 letter circles) → start-time chip opening inline time picker (hour scroll + minute buttons + AM/PM toggle) → duration segmented (0.5/1/1.5/2 h) → who pill (me·sofia·both with `WhoDot`) → icon + color.
- **Current state**: 365 loc. Target inlines the time picker instead of a second sheet — correct.

### 4.27 Sheet · `app/sheets/new-wish.tsx` (Wishlist item)

- **Design intent (`WishlistSheet`)**: title input → price input (€/$) → category pill row (Home · Hobby · Kitchen · Travel · Date · Other) → who pill (Sofia's / Mine / Shared) → optional link/URL input.
- **Gaps**: full.

### 4.28 Sheet · `app/sheets/profile.tsx` (Profile & settings)

- **Design intent (`ProfileSheet`, `sheets-us.jsx`)**: rose paired-avatar couple card (Mattia letter + bridge + Sofia letter, "SINCE …" overline, 22-big couple name, 3-stat footer: DAYS · ENTRIES · MILESTONES) → Appearance segmented (Sun · Moon, 18-big Bricolage) → Settings list (user·heart·bell·shield, 38 icon tiles with feature pastels) → Support list → red "Sign out" link → "COUPL · v1.0.0" footer.
- **Current state**: 309 loc. Implemented.
- **Gaps**: verify the settings icon-tile colors use feature pastels, not `goldSoft` defaults. Hook Sofia-specific entries behind `!isSolo`.

### 4.29 Sheet · `app/sheets/rings-history.tsx`

- **Not in Coupl.html.** Target-only. No design spec — build a dedicated rings history view using the target's existing `TripleRing` component; show 7-day grid of triple rings with % labels.

---

## 5. Animation + micro-interaction catalog

Pulled from CSS and JSX — the source uses minimal animation, leaning on transforms and state-driven style changes. React Native port should use `Animated` / `Moti` / `react-native-reanimated` accordingly. Target already includes `react-native-reanimated` and `react-native-gesture-handler`.

### 5.1 Selection / state transitions

| Where | Trigger | Behavior |
|---|---|---|
| Home `MoodChip` | tap | `transform: scale(1.05)` on selected, `transition: all 0.2s`. Background swaps to `m.bg`, border disappears. Logged-mood row fades in below with the mood color tint. |
| Home `WeekDay` | tap | Background fills gold, text color inverts to `peachInk`. Today-dot disappears when selected. No explicit duration → 0 in the source (we add 150-200 ms ease). |
| Journal tab bar | tap | Underline jumps via `borderBottom: 2px solid` swap. Color interpolates from `C.fog` to `C.journal`. |
| `TaskListDetail.quickAdd` button | input fills | Background transitions from `C.cardHi` to the list color when `quickAdd.trim()` is non-empty. Icon color from `C.fog` to `C.ink`. |
| `CreateEntrySheet.private` toggle | tap | 44×26 pill switch, `position.left` animates 3→21 over 0.2s. |
| `Pill` active state | tap | Border → none, bg fills `activeBg`, text to `activeColor`. Static (no explicit transition; add `LayoutAnimation` or reanimated 200ms ease-out on mount). |

### 5.2 Sheet presentation

Design uses a custom `Sheet` with `transform: translateY(100%) → translateY(0)`, `transition: transform 0.32s cubic-bezier(.2,.8,.2,1)` + backdrop fade `opacity 0 → 1` over 0.25s. **Target replaces this with the native iOS form-sheet** (`presentation: 'formSheet'` on the Stack screen), which provides its own spring-driven detent animation. No manual animation needed.

### 5.3 Sticky headers

`StickyDate` uses `position: sticky; top: 0` with `backdrop-filter: blur(10px)` over `C.ink + E6`. RN port: use `Animated.ScrollView` + `onScroll` + `position: absolute` with `transform` driven by scrollY, OR lean on `@shopify/flash-list` sticky headers, OR layer target's `GlassView` (already supports a blurred material) above a scroll container.

### 5.4 Collapsible sections

`DateSectioned` collapses the Nth-onwards sections behind a dashed-border "Show N more" card. Design uses state + conditional render (no animation). Port should use `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before the `setExpanded` toggle for a smooth height transition.

### 5.5 Scroll-based behaviors

- Tab bar `NativeTabs` with `minimizeBehavior="onScrollDown"` — tab bar shrinks on scroll down, expands on scroll up. Already wired in target.
- Header transparency — the Stack header is `headerTransparent: true`, content scrolls under. Solid screens set `underHeader=true` on `Screen` to push content down.

### 5.6 Ring entrance

Home hero `TripleRing` animates in via `strokeDashoffset` going from `c` → `c*(1-value)`. Design doesn't animate; target should, using reanimated's `withTiming(value, {duration: 900, easing: easeOutCubic})` on mount for each ring (staggered 100 ms).

### 5.7 Haptics

- `ScreenHeader` back/action in target calls `Haptics.selectionAsync()` on press. Continue this pattern across all primary buttons and sheet save actions.
- Sheet close → no haptic (system handles form-sheet dismiss).
- Check/toggle state changes in `ReminderRow`, `TaskListDetail` → add `selectionAsync()` on each toggle.

### 5.8 Ambient glow

`SignInScreen` has two 240×240 `radial-gradient` ambient blobs (gold top-right, rose bottom-left, both at 0.13 alpha). These are decorative only — port as `<View>` with an `expo-linear-gradient` `<RadialGradient>` polyfill, OR as a static `<Svg>` radial fill.

### 5.9 `CouplRings` brand mark

Static SVG — no animation in source. Optional: gentle rotate `from 0deg to 3deg` oscillation on sign-in hero for life.

---

## 6. Nav + sheet presentation patterns · **header exception**

### 6.1 Root stack (`app/_layout.tsx`)

```
Stack
├─ (tabs)              headerShown: false
├─ (auth)              headerShown: false
├─ notifications       headerShown: true, transparent, title "Notifications"
└─ sheets/*            presentation: 'formSheet', sheetGrabberVisible,
                       sheetCornerRadius: 28, sheetAllowedDetents: 'fitToContents',
                       contentStyle.backgroundColor: C.coal
```

### 6.2 Tabs layout (`app/(tabs)/_layout.tsx`)

`NativeTabs` with 5 tabs: home · us · calendar · tasks · reminders. `tintColor: C.gold`, labels Space Grotesk 700 at 11 px, `minimizeBehavior="onScrollDown"`. Solo-aware: Us label flips to "Me" + icon `person.fill` when `isSolo`.

### 6.3 Per-tab Stacks — **header exception lives here**

Every tab has its own `_layout.tsx` Stack. Every screen inside has its header rendered by the Stack as a **transparent native header** whose `headerTitle` is a centered `<HeaderBrand eyebrow="…" title="…" accent={…}/>` and whose `headerLeft`/`headerRight` supply navigation icons. Observed pattern in the worktree:

| Layout file | `headerTitle` | `headerLeft` | `headerRight` |
|---|---|---|---|
| `app/(tabs)/home/_layout.tsx` | `HeaderBrand eyebrow="Good morning" title="MATTIA"` | `HeaderLeft mode="home"` (bell) | overlapping Avatar pair opening `sheets/profile` |
| `app/(tabs)/tasks/_layout.tsx` | `HeaderBrand eyebrow="04 · Tasks" title="TASKS" accent={pastels.tasks}` | `HeaderLeft mode="back"` | `NavAddBtn href="/sheets/new-list"` |
| `app/(tabs)/calendar/_layout.tsx` | via `TabStackLayout` eyebrow="April 2026" title="CAL" | `HeaderLeft mode="back"` | `NavAddBtn href="/sheets/new-reminder"` |
| `app/(tabs)/reminders/_layout.tsx` | via `TabStackLayout` eyebrow="06 · Reminders" title="REMIND" accent={pastels.reminders} | `HeaderLeft mode="back"` | `NavAddBtn href="/sheets/new-reminder"` |
| `app/(tabs)/us/_layout.tsx` | per-route `HeaderBrand` per child (notes / checkins / expenses / wishlists / milestones / plans / journal / timetables/index / timetables/[id]) with matching `accent={pastels.X}` and `NavAddBtn href` | `HeaderLeft mode="back"` | per-route `NavAddBtn` or Avatar-pair |

### 6.4 Header exception — porting rules

**When porting a design screen that contains any of the following in its body, strip that block before pasting; the Stack header renders the equivalent:**

- `<ScreenHeader eyebrow title accent meta action>` (from `atoms.jsx`) — present in `HomeScreen` *(non-native branch)*, `RemindersScreen`, `TasksScreen`, `JournalScreen`, `MoreScreen`.
- `<NativeHeader title eyebrow chip right left>` (from `native-header.jsx`) — used when `window.__nativeHeader=true` is the tweak. The Stack header is the RN-native equivalent; don't draw a second one.
- `<SubScreenHeader eyebrow title onBack onAdd>` (from `atoms.jsx`) — used by `PlansScreen` and the in-body branches of every Us-child screen. Remove.
- Ad-hoc header blocks at the top of `CalendarScreen`, `TogetherScreen`, `LoveNotesScreen`, `CheckinsScreen`, `ExpensesScreen`, `WishlistsScreen`, `MilestonesScreen`, `TimetablesScreen`, `TimetableDetailScreen` — all hand-rolled `<div style={padding:'0 20px 18px', display:'flex', alignItems:'center', gap:14}>…</div>` with a back button + eyebrow/title. Remove; the Stack handles this.
- `Coupl.html` showcase masthead blocks (the issue / Vol. III eyebrow + big `US.` wordmark + linear-gradient rule) are **showcase chrome**, not screen content — do not port. The Stack header's `HeaderBrand` + `accent={C.gold}` already carries the brand.

**When porting, the first visible element inside `<Screen>` should be either the hero pastel card (Home, Reminders, Tasks, Us-children) or the date pill (Us hub, Calendar).** Not a header.

### 6.5 Sheet patterns

All sheets:

1. Register in root stack with `presentation: 'formSheet'` + `sheetAllowedDetents: 'fitToContents'` + `sheetCornerRadius: 28`.
2. Body wrapped in `<SheetShell eyebrow eyebrowColor title footer>…</SheetShell>`, which provides the top close-btn + title row and a bounces-disabled scroll container.
3. `router.back()` closes. No custom backdrop, no custom transform — the system form-sheet handles drag-to-dismiss.
4. The footer slot (passed as prop) is where `PrimaryButton` "Save …" lives, full-width.
5. Accent color per sheet: reminder→reminders, entry→journal, list→peach (or list color), note→rose, checkin→butter, expense→mint, wish→lavender, milestone→peach, plan→sky, timetable→peach, timetable-item→peach, profile→rose.

### 6.6 Us-child FAB **do not port**

Coupl.html's `PresetApp` renders a manual floating `+` button on every Us sub-screen (bottom-right, 56 px, `boxShadow: 0 10px 24px rgba(228,178,74,0.35)`). The target puts the plus in the Stack header (`NavAddBtn`) instead — **drop the floating FAB** when porting.

---

## Appendix · verification commands

```bash
# Design bundle lives under docs/design-reference/
find docs/design-reference -type f

# Current target screens / sheets
find app -type f -name '*.tsx' | sort

# Tokens verification
diff <(grep -A4 "gold: '#E4B24A'" src/lib/tokens.ts) \
     <(grep -A4 "gold: '#E4B24A'" docs/design-reference/project/src/tokens.jsx)

# UI components in target
ls src/components/ui/
```
