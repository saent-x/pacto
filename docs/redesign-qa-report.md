# Final QA — redesign port vs `/Users/tor/coupl-redesign`

**Date:** 2026-04-24
**Scope:** Visual + flow + interaction + animation + data-state diff. Every screen & sheet in the running app, side-by-side with the redesign scaffold at `/Users/tor/coupl-redesign`.
**Reference spec:** `docs/redesign-spec.md` (canonical intentional deviations, §6).
**Method:** Direct file-level compare target ↔ redesign, cross-checked against redesign-spec.md §4–§6. No code changes in this pass — fixes tracked as backlog entries under `docs/backlog/`.

---

## Summary

- **HIGH:** 3
- **MED:** 7
- **LOW:** 10
- **CONFIRMED INTENTIONAL:** 12 (listed at bottom)

Target is a **superset** of the redesign scaffold — richer primitives (haptics, `PressScale`, animated rings, `AnimatedBar`, `LayoutAnimation` on `DateSectioned`), live InstantDB bindings on every screen, skeletons, empty states, and solo-mode branching. The redesign scaffold was a static port; the target is the production wiring layer. Most deltas below are the last editorial details that didn't survive that wiring pass, plus a few spec §6 exception violations (in-body headers that should have been dropped; FAB that should have been dropped).

---

## HIGH

### H1 — tasks/[listId] retains in-body coal-band header; Stack header not wired

- **Where:** `app/(tabs)/tasks/[listId].tsx:118-165` (coal band), `app/(tabs)/tasks/_layout.tsx` (missing `Stack.Screen name="[listId]"`)
- **Design vs current:** Redesign has a coal-band header with back-round-btn + pill tag + plus-round-btn because it has no native Stack header. Per spec §4.4 + §6.4, target should drop the coal band and render brand via the Stack header with a dynamic `HeaderBrand` (`title = listName`, `accent = list.color`). Progress bar + list-color pill should move into the screen body under it.
- **Impact:** Two stacked headers (native ink + internal coal) on a list-detail page. Breaks the "first visible element is hero card" rule from spec §6.4.
- **Backlog:** `docs/backlog/redesign-qa-H1-task-detail-stack-header.md`

### H2 — tasks/[listId] missing sticky bottom `quickAdd` input pill

- **Where:** `app/(tabs)/tasks/[listId].tsx` (no quick-add pill rendered anywhere in body)
- **Design vs current:** Redesign (and spec §4.4) specifies a sticky `quickAdd` input pill at the bottom of the list with an arrow-up send button; background transitions from `C.cardHi` → list color when the input trims non-empty. Target only exposes task creation via the Stack header's plus-btn which routes to `/sheets/new-task`.
- **Impact:** Primary "add inline" interaction gone; users must tap + → sheet → type → save for every task. Regression vs redesign flow.
- **Backlog:** `docs/backlog/redesign-qa-H2-task-detail-quickadd-pill.md`

### H3 — Us timetable detail has floating gold FAB (spec §6.6 forbids)

- **Where:** `app/(tabs)/us/timetables/[id].tsx:256-280` (absolutely-positioned gold 54×54 round btn with `C.gold` shadow at bottom:110 / right:22)
- **Design vs current:** Spec §6.6 ("Us-child FAB — **do not port**") is unambiguous — the target puts the plus in the Stack header (`NavAddBtn`) on every Us-child; the FAB is `PresetApp` chrome from Coupl.html that must not survive porting. Every other Us-child honors this; `timetables/[id].tsx` is the lone offender.
- **Impact:** Two plus-buttons on the same screen (Stack header + floating FAB).
- **Backlog:** `docs/backlog/redesign-qa-H3-timetables-detail-remove-fab.md`

---

## MED

### M1 — Home hero card missing `+12% WK` Badge

- **Where:** `app/(tabs)/home/index.tsx:366-373` (target). Redesign ref: `/Users/tor/coupl-redesign/app/(tabs)/home/index.tsx:141-145`.
- **Design vs current:** Redesign places a `<Badge bg="rgba(58,31,20,0.15)" color={C.peachInk}>+12% WK</Badge>` absolutely positioned top-right of the peach `BlockCard` rings hero. Target omits it. Flagged in spec §4.1 explicitly.
- **Impact:** Editorial detail loss on the hero card — the metric badge is the only floating content on the hero.
- **Backlog:** `docs/backlog/redesign-qa-M1-home-hero-wk-badge.md`

### M2 — new-wish missing who-picker (Sofia's / Mine / Shared)

- **Where:** `app/sheets/new-wish.tsx` (no who picker rendered)
- **Design vs current:** Spec §4.27 calls for a who pill row (Sofia's / Mine / Shared). Target has title + price + link + tag, but `addedBy` is force-set to `user.id` in `useQuickAddWishItem`, so every wish saved is always "Mine". The Wishlists screen *can filter* by SHARED / PARTNER but nothing ever writes those states.
- **Impact:** SHARED and PARTNER filters are permanently empty.
- **Backlog:** `docs/backlog/redesign-qa-M2-new-wish-who-picker.md`

### M3 — new-checkin missing energy slider

- **Where:** `app/sheets/new-checkin.tsx` (no slider; only mood row + "one thing" input + visibility note)
- **Design vs current:** Spec §4.16: "mood slab row (5 options), **energy slider**, note textarea, save". Target replaces energy with "One thing" text input. Either the spec changed scope or the slider was dropped.
- **Impact:** Cannot capture energy level alongside mood.
- **Backlog:** `docs/backlog/redesign-qa-M3-new-checkin-energy-slider.md`

### M4 — new-milestone date picker non-interactive

- **Where:** `app/sheets/new-milestone.tsx:125-155` (When row renders today's date + "TAP TO EDIT" label that doesn't wire to any picker)
- **Design vs current:** Spec §4.20 calls for a date picker row (month/year). Target hard-codes `format(new Date(), 'yyyy-MM-dd')` at save time with no UI to pick a different date.
- **Impact:** Every milestone is saved with today's date. Cannot record past or future milestones (anniversaries, birthdays).
- **Backlog:** `docs/backlog/redesign-qa-M4-new-milestone-date-picker.md`

### M5 — profile sheet settings icon-tiles use gold, not feature pastels

- **Where:** `app/sheets/profile.tsx:335` (`<IconTile icon={r.icon} bg={C.cardHi} color={C.gold} ...>`)
- **Design vs current:** Spec §4.28: "verify the settings icon-tile colors use feature pastels, not `goldSoft` defaults" — e.g. `user → gold`, `heart → rose`, `bell → butter`, `shield → mint`. Target uses uniform `C.cardHi` / `C.gold` on every row.
- **Impact:** Settings list reads monotone; redesign spec treats this as pastel-per-row.
- **Backlog:** `docs/backlog/redesign-qa-M5-profile-settings-pastels.md`

### M6 — us/index date pill hardcoded `THU · 17 · 11 · MATTIA × SOFIA`

- **Where:** `app/(tabs)/us/index.tsx:200`
- **Design vs current:** Both target and redesign hardcode this string. Target is otherwise fully dynamic (features wired to 7 hooks), but this single pill is static and solo-mode-unaware (`MATTIA × SOFIA` renders in solo mode too).
- **Impact:** Stale date stamp; solo leaks couple copy.
- **Backlog:** `docs/backlog/redesign-qa-M6-us-date-pill-dynamic.md`

### M7 — us/index MoodSlab and "ON THIS DAY" cards hardcoded

- **Where:** `app/(tabs)/us/index.tsx:218-246` (`MoodSlab` pair + "86% IN SYNC · 4-DAY STREAK" kicker), `484-493` (ghost year `'24` stamp), `508-519` (quote body)
- **Design vs current:** `MoodSlab` values (`Good · 7h sleep · calm` / `Bright · Just finished yoga` / `bars=[1, 1, 0.7, 1, 0.4]`), the streak pill, and the "On this day" year + quote are all static strings. Every other feature card on this screen is bound to hooks (`useCheckIns`, `useLoveNotes`, etc.).
- **Impact:** Screen mixes live and demo data; looks correct on-device until you compare with another account.
- **Backlog:** `docs/backlog/redesign-qa-M7-us-mood-onthisday-wiring.md`

---

## LOW

### L1 — us/wishlists filter pills use gold accent, not lavender (feature color)

- **Where:** `app/(tabs)/us/wishlists.tsx:164, 169` (active bg `C.goldSoft`, text `C.gold`)
- **Design vs current:** Spec convention (matches `reminders` using `C.reminders` accent on its filter pills) is that each feature's filter pills carry the feature accent. Lavender would be `C.lavenderInk` × `rgba(184,168,232,0.2)`.
- **Backlog:** `docs/backlog/redesign-qa-L1-wishlists-filter-accent.md`

### L2 — new-wish eyebrow accent peach, spec says lavender

- **Where:** `app/sheets/new-wish.tsx:49` (`eyebrowColor={C.peach}`)
- **Design vs current:** Spec §6.5 maps `wish → lavender`. Target uses `C.peach`.
- **Backlog:** `docs/backlog/redesign-qa-L2-sheet-accents.md` (batched)

### L3 — new-entry missing `eyebrowColor` (spec says journal)

- **Where:** `app/sheets/new-entry.tsx:92` (no `eyebrowColor` passed → SheetShell default)
- **Design vs current:** Spec §6.5 maps `entry → journal`. Add `eyebrowColor={C.journal}`.
- **Backlog:** `docs/backlog/redesign-qa-L2-sheet-accents.md` (batched)

### L4 — new-checkin accent follows mood, not butter

- **Where:** `app/sheets/new-checkin.tsx:53` (`eyebrowColor={active.color}`)
- **Design vs current:** Spec §6.5 maps `checkin → butter`. Target lets accent track selected mood (debatable improvement; flagging for intentional-vs-drift review).
- **Backlog:** `docs/backlog/redesign-qa-L2-sheet-accents.md` (batched)

### L5 — new-milestone default accent rose, spec says peach

- **Where:** `app/sheets/new-milestone.tsx:39` (default `C.rose`)
- **Design vs current:** Spec §6.5 maps `milestone → peach`. Low-impact since accent is user-selectable.
- **Backlog:** `docs/backlog/redesign-qa-L2-sheet-accents.md` (batched)

### L6 — new-expense amount text 64px (spec says 48)

- **Where:** `app/sheets/new-expense.tsx:111` (`fontSize: 64`)
- **Design vs current:** Spec §4.18: "big amount input (Bricolage 48 with € prefix and cents dimmed)".
- **Backlog:** `docs/backlog/redesign-qa-L6-new-expense-amount-polish.md`

### L7 — new-expense cents not dimmed

- **Where:** `app/sheets/new-expense.tsx:92-117` (single TextInput; no segmented whole/decimal)
- **Design vs current:** Spec §4.18 calls for cents at opacity .6. Target renders the whole amount at one color.
- **Backlog:** `docs/backlog/redesign-qa-L6-new-expense-amount-polish.md` (batched)

### L8 — new-wish tag labels differ from spec

- **Where:** `app/sheets/new-wish.tsx:11` (`HOME · TRAVEL · TREATS · BIG · KITCHEN · CLOTHES`)
- **Design vs current:** Spec §4.27 list: `Home · Hobby · Kitchen · Travel · Date · Other`. Target labels and spec labels diverge; pick one canonical set.
- **Backlog:** `docs/backlog/redesign-qa-L8-new-wish-tags-labels.md`

### L9 — new-timetable share picker hardcodes "Sofia's"

- **Where:** `app/sheets/new-timetable.tsx:205` (`{ k: 'partner', l: "Sofia's", ... }`)
- **Design vs current:** The other sheets resolve partner name via `useSession().partner.displayName`. This one still says `Sofia's`.
- **Backlog:** `docs/backlog/redesign-qa-L9-new-timetable-partner-name.md`

### L10 — SignIn missing ambient radial blobs

- **Where:** `app/(auth)/sign-in.tsx`
- **Design vs current:** Design source has two 240×240 `radial-gradient` ambient blobs (gold top-right, rose bottom-left, both at 0.13 alpha) behind the CouplRings hero (spec §5.8). Target has none — pure `C.ink` background.
- **Impact:** Sign-in feels flatter than the design intent; low-visual, pre-auth only.
- **Backlog:** `docs/backlog/redesign-qa-L10-signin-ambient-blobs.md`

---

## CONFIRMED INTENTIONAL (expected deviations from redesign scaffold)

These were verified present and are **not** deltas. They are listed so the report is exhaustive and future QA passes don't re-flag them.

1. **Stack header replaces in-body editorial header on every tab screen.** Target renders brand/back/add via transparent native `Stack` header with `HeaderBrand` + `HeaderLeft` + `NavAddBtn` or `headerRight` Avatar stack. The redesign scaffold's in-body `ScreenHeader` / `SubHeader` / ad-hoc header blocks are correctly stripped everywhere except tasks/[listId] (H1). Spec §6.3–§6.4.
2. **Sheets use system `formSheet` presentation** with `sheetCornerRadius: 28`, `sheetAllowedDetents: 'fitToContents'`, `contentStyle.backgroundColor: C.coal`. No custom translateY or backdrop. Spec §6.5.
3. **Auth group (`(auth)/sign-in · onboarding · invite · invite-code`)** is target-only; redesign has no auth. Maps to design frames 01–03 + one synthesis. Spec §1.
4. **Notifications route** (`app/notifications.tsx`) is target-only; Coupl.html reserves the slot but has no design frame. Fully wired to `useNotifications` (buckets, staggered `FadeInDown` entry, unread dot fade, mark-all-read on unmount). Spec §1.
5. **Profile as sheet, not tab.** Target presents `MoreScreen` as `sheets/profile.tsx` rather than a 5th tab. Spec §1, §4.28.
6. **Solo-mode everywhere.** Target hides the partner Avatar on Home, flips Us tab label/icon to "Me" + person, collapses the `PARTNER` / `SHARED` filters on Wishlists in solo, switches the Assign-to picker in new-reminder to single option, etc. Target-only branching vs redesign's couple-only demo.
7. **`GlassView` / `GlassRow` / `GlassSection` liquid-glass layer** is target-only (iOS 26 material). Not present in redesign.
8. **`[listId]` route name** (vs redesign `[id]`). Spec §1: "Keep `[listId]`."
9. **`AnimatedTripleRing` with mount stagger on Home hero** vs static `TripleRing` in redesign. Target enhancement per spec §5.6.
10. **Haptics + `PressScale` on atoms** (`BlockCard`, `DarkCard`, `Pill`, `RoundBtn`, `PrimaryButton`) — target enhancement. Spec §5.7.
11. **`LayoutAnimation` on `DateSectioned` collapse/expand**, `AnimatedBar` on reminders/plans/tasks-detail/checkins progress bars — target polish. Spec §5.4.
12. **Editorial-only Us variant; no TweaksPanel.** Spec §4.6 + §1 locks `usVariant=editorial`, `remindersPlacement=tasks-filter`, no native-header tweak.

---

## Appendix · methodology

- Primitives compared: `components/atoms.tsx` redesign vs `src/components/ui/atoms.tsx` target — target is a strict superset. No regressions.
- Every screen file diffed at the source level; for each target screen, the hero card, data source (hook vs hardcode), filter/tab state, empty state, skeleton, and accent/color wiring were checked against the redesign scaffold.
- Accent colors per sheet cross-checked against spec §6.5. Per-tab `_layout.tsx` `HeaderBrand` eyebrows + accents cross-checked against spec §6.3.
- Spec §6.6 (no FAB on Us children) checked on all nine Us children.
- Date-pill, mood-strip, and "On this day" copy on `us/index.tsx` checked for static-string leakage.

All deltas above are single-file fixes or small section rewrites; none require architectural changes.
