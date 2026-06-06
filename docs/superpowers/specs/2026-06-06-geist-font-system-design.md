# Geist Font System Design

## Goal

Move Pacto from an editorial serif-heavy typography system to a precise, calm system typography direction using Geist and Geist Mono.

## Current context

Pacto currently loads:

- `Instrument Serif` for display through `FONTS.serif` and `FONTS.serifItalic`.
- `Schibsted Grotesk` for UI and body through `FONTS.sans400` through `FONTS.sans700`.
- `Bitcount Prop Single` for logo/brand moments through `FONTS.pixel`.

The UI uses `Serif` heavily for page titles, large counters, section headlines, invite codes, and some time values. `T` and `Kick` cover body, labels, and metadata. Several screens also set `fontFamily` directly from `FONTS` for form fields.

## Approved direction

Use **Geist + Geist Mono** as the new app font system.

- Geist is the default face for display, body, labels, controls, navigation, and form text.
- Geist Mono is reserved for numeric/system data: times, dates, counts, percentages, invite codes, compact metadata, and progress values.
- Bitcount remains for the logo. This is not a logo or brand mark refresh.

## Rationale

This direction makes Pacto feel more like a polished shared-life operating system and less like a sentimental journal. It supports tasks, reminders, targets, timetable, and check-ins with stronger consistency and clearer numeric hierarchy. Mono usage should be deliberate and sparse so the app stays calm rather than technical.

## Typography roles

### Display

Display text uses Geist at heavier weights and tighter tracking.

Examples:

- Home greeting and focus headline.
- Page titles such as `today's focus`, `Your spaces`, `Recent`.
- Large screen-level counters when they behave as headlines.

Implementation role:

- Replace `FONTS.serif` and `FONTS.serifItalic` with a Geist-backed display role.
- Keep the existing `Serif` component temporarily as a compatibility wrapper, but make its internals use display tokens. A later cleanup can rename it to `Display` after call sites are stable.

### Body and UI

Body and UI text use Geist regular through bold.

Examples:

- `T` body copy.
- Buttons.
- Form fields.
- Navigation labels.
- Sheet fields and chips.

Implementation role:

- Replace Schibsted font tokens with Geist tokens.
- Keep `sansFamily(weight)` behavior so React Native picks explicit loaded families rather than relying on synthesized weights.

### Mono data

Mono text uses Geist Mono only when tabular/system clarity matters.

Examples:

- Timetable times.
- Reminder time metadata.
- Invite codes.
- Large progress percentages and count/stat values.
- Compact metadata where scanability matters.

Implementation role:

- Add `FONTS.mono400`, `FONTS.mono500`, and `FONTS.mono600` if package exports are available.
- Add `monoFamily(weight)` with the same explicit-family approach as `sansFamily`.
- Add a small `Mono` text component or a `mono` prop only if it reduces direct `fontFamily` use. Prefer a `Mono` component for clarity.

## Non-goals

- No logo redesign.
- No new theme colors.
- No layout redesign.
- No full copy rewrite.
- No custom remote font loading. Fonts should be bundled through Expo-compatible packages or static assets.

## Acceptance criteria

- The app loads Geist and Geist Mono before hiding the splash screen.
- No screen depends on Instrument Serif or Schibsted Grotesk after the migration.
- Direct `fontFamily` usage routes through tokens or dedicated text components.
- Numeric/system fields that benefit from mono use Geist Mono consistently.
- TypeScript passes.
- Expo lint passes or reports only issues unrelated to typography migration that are explicitly documented separately.
- A browser or simulator smoke pass confirms the main visual surfaces render without missing-font fallback.

## Testing plan

1. Run TypeScript with `npx tsc --noEmit`.
2. Run lint with `npm run lint`.
3. Start the Expo web app and inspect at least:
   - Home tab.
   - Tasks.
   - Timetable.
   - Journal entry editor.
   - Profile or Spaces invite code.
4. Verify console output has no missing-font warnings.
5. Verify the splash screen does not hang waiting for fonts.

## Rollout notes

Make this a clean cutover at the token/provider layer. Avoid migrating half the app to direct Geist usage while leaving old tokens in place. Keep compatibility wrappers only where they reduce churn and do not preserve old font behavior.
