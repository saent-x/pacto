# Functional Completion + Feature Controls Design

## Goal

Make Pacto functional end to end by removing dead interactions, mock/demo data leaks, and non-persisting controls while adding account-type feature selection during onboarding and feature toggles in Profile.

The app no longer uses Convex in this checkout. InstantDB is the backend source of truth for this work.

## Decisions

- Use the broad single-pass strategy requested by the user.
- Use the selected onboarding pattern: account mode first, feature selection second.
- Feature settings are stored at the space level and shared by everyone in the pact.
- Disabling a feature hides entry points and avoids feature-specific UI queries where practical, but never deletes existing data.
- If stored feature settings are missing, the app computes defaults from the account type.
- Profile can change enabled features after onboarding.
- Existing data becomes visible again when a feature is re-enabled.

## Feature Registry

Create a central registry that owns feature metadata and defaults:

- `home`
- `calendar`
- `reminders`
- `tasks`
- `notes`
- `checkins`
- `expenses`
- `wishlists`
- `milestones`
- `plans`
- `journal`
- `timetables`
- `assistant`

Each feature definition includes:

- ID
- label
- short description
- accent color token
- icon name
- related routes and sheet routes
- default enabled state by account mode: Solo, Pair, Crew
- feature group for navigation, such as Core, Shared Life, Memory, Money, Planning

Suggested defaults:

| Feature | Solo | Pair | Crew |
|---|---:|---:|---:|
| Home | on | on | on |
| Calendar | on | on | on |
| Reminders | on | on | on |
| Tasks | on | on | on |
| Notes | off | on | on |
| Check-ins | on | on | off |
| Expenses | off | on | on |
| Wishlists | on | on | on |
| Milestones | on | on | on |
| Plans | on | on | on |
| Journal | on | on | off |
| Timetables | off | on | on |
| Assistant | on | on | on |

Home should stay enabled because it is the shell summary. If a later product decision allows hiding Home, it should be handled as a separate navigation redesign.

## Data Model

Add an optional JSON field on `spaces`:

```ts
enabledFeatures: i.json().optional()
```

The stored value is an array of feature IDs. The app sanitizes it on read:

- Non-array values are ignored.
- Unknown IDs are ignored.
- Duplicate IDs are removed.
- If the sanitized list is empty because storage is missing or invalid, defaults for the current mode are used.

No backfill is required. Existing spaces keep working through computed defaults.

## Session API

Extend the current session layer so screens do not repeat feature logic:

```ts
type Session = {
  enabledFeatures: FeatureId[];
  isFeatureEnabled: (id: FeatureId) => boolean;
};
```

The lower-level `src/lib/session.tsx` should normalize the raw space field. The adapter in `src/hooks/useSession.ts` should expose the same values to existing hooks and screens.

## Onboarding

The onboarding flow becomes:

1. User picks account mode: Solo, Pair, or Crew.
2. App shows feature checklist with account-mode defaults selected.
3. User can toggle modules before creating the space.
4. Creating the space stores `kind` and `enabledFeatures`.
5. Pair and Crew still generate an invite code. Solo enters the app directly.

The selected browser mockup uses this layout:

- Header: “what should this pact hold?”
- Account-mode segmented control or selected mode summary.
- Feature groups with feature rows and switches.
- Continue button disabled only while saving.
- Defaults are visible, not hidden behind presets.

## Profile

Profile gets a `Features` section using the same registry and grouping as onboarding.

Profile toggles:

- Persist to `spaces.enabledFeatures`.
- Apply to the entire space, not just the current user.
- Cannot disable `home`.
- Can disable all optional features; the app should still remain navigable through Home, Profile, and auth/session controls.
- Should show concise helper text explaining that disabling hides the feature and keeps data.

Profile should also absorb existing design consistency fixes where it is touched:

- Settings rows use feature accent tiles instead of one monotone gold treatment.
- Profile remains a sheet.
- Danger-zone actions stay explicit and confirmed.

## Runtime Behavior

Feature gating should be centralized and predictable:

- Bottom tabs hide feature groups that are disabled.
- Us/Me hub cards hide disabled modules.
- Header add buttons route only to enabled features.
- Quick-action rows hide disabled sheet routes.
- Home summaries and Calendar timelines omit disabled feature types.
- Directly opened disabled-feature sheets do not write data. They show an unavailable state or redirect back.
- Directly opened disabled-feature screens show an unavailable state or route to the nearest enabled parent.

Feature toggles do not affect auth, invite flows, session loading, Profile, or notification infrastructure.

## Functional Completion Scope

This pass includes the known static, mocked, or incomplete surfaces discovered in the repo and QA docs.

High-priority fixes:

- Replace the task detail in-body header with the intended stack/header structure.
- Add the task detail sticky quick-add input and make it create tasks.
- Remove the duplicate floating add button from timetable detail.

Medium-priority fixes:

- Home activity/rings mock pattern becomes derived from real app data or an honest empty value.
- Home hero weekly badge becomes data-derived or is removed if no honest metric exists.
- Wishlist item creation supports Mine, Partner, and Shared states so filters can show real data.
- Check-ins capture the energy value if the UI presents an energy control.
- Milestone sheet date picker persists the selected date.
- Us/Me date pill becomes dynamic and solo/pair/crew aware.
- Us/Me mood and “On this day” sections use check-ins, journal, notes, and milestones instead of hardcoded demo strings.
- Timetable share labels use the real partner/member name instead of hardcoded copy.

Low-priority polish included because the pass is intentionally broad:

- Align feature accents for filters and sheet eyebrows.
- Improve expense amount input sizing and cents treatment if the current field remains.
- Align wishlist tag labels to the registry/spec vocabulary.
- Restore or replace sign-in ambience only if it fits the current design language.

Any UI that cannot be made functional in this pass should be removed or replaced with a clear empty state and action. The app should not display fake personalized content.

## Design Language

Use the current `pacto` primitives and warm token system rather than adding another visual language.

Rules for the pass:

- Prefer compact, scannable cards over large decorative panels.
- Use feature accents consistently across onboarding, Profile, screens, filters, and sheets.
- Keep cards to real repeated items, individual settings groups, or actual tool panels.
- Avoid nested cards and decorative blobs.
- Use current icon assets through `Icon` and existing primitives.
- Empty states should explain the current state and provide one clear action.
- No visible copy should describe implementation details or shortcuts.

## Testing

Add focused tests for the high-risk behavior:

- Registry defaults for Solo, Pair, and Crew.
- Sanitizing stored feature lists.
- Session exposes enabled features and `isFeatureEnabled`.
- Onboarding creates a space with selected feature IDs.
- Profile toggles persist feature IDs and preserve existing data.
- Disabled features disappear from tab/hub/add entry points.
- Direct disabled-feature sheet access cannot create records.
- Milestone date picker saves the selected date.
- Wishlist Mine/Partner/Shared creation and filters agree.
- Task quick-add creates a task in the current list.
- Us/Home dynamic sections do not render known hardcoded demo strings.

Run the existing Vitest suite after implementation. For visual changes, run the app in the browser or simulator where feasible and inspect onboarding, Profile, Home, Us/Me, task detail, milestones, wishlists, check-ins, and timetables.

## Rollout

This is a client-compatible change:

1. Add optional schema field.
2. Read defaults when field is absent.
3. Write selected feature IDs during onboarding and Profile changes.
4. Gate UI surfaces.
5. Replace mock/static sections with live data or empty states.

No destructive migration, backfill, or data deletion is part of this work.

## Non-Goals

- Deleting feature data when a feature is disabled.
- Per-user feature settings inside a shared space.
- Billing or entitlement enforcement.
- Changing auth provider behavior.
- Reintroducing Convex.
- Rebuilding the entire visual system from scratch.
