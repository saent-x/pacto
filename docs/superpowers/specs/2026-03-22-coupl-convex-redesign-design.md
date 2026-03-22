# Coupl Convex Redesign Design

## Overview

Coupl will be redesigned as a native-feeling shared life app for couples with an editorial, romantic top layer and a calmer operational planning layer beneath it. The product should no longer read as a set of adjacent productivity tabs with relationship styling on top. It should feel like one coherent private space for two people, with real-time shared state, intimate cues, and practical coordination built into the same surface.

This redesign also includes a backend migration from Supabase to Convex. The result should use Convex as the source of truth for live data, business logic, and shared access boundaries, while the client becomes thinner and more native in behavior on both iOS and Android.

## Goals

- Redesign the app around a `Dual-Layer Hybrid` product direction.
- Make the first viewport emotional, cinematic, and unmistakably about the relationship.
- Make the lower planning layer practical, legible, and fast to operate.
- Replace Supabase-based auth and table access with Convex-based real-time architecture.
- Ship a complete, working product loop with real auth, shared syncing, and broadened feature depth.
- Preserve one brand language across platforms while making interactions feel native on iOS and Android.

## Non-Goals

- Do not preserve the current information architecture just because it already exists.
- Do not treat reminders and tasks as the top-level product identity.
- Do not build shallow placeholder features that exist only to fill navigation.
- Do not force a single interaction style across iOS and Android where platform expectations differ.

## Product Direction

### Core Thesis

Coupl should feel like a shared private world, not a romantic wrapper around a task app. The app opens with emotional context first, then resolves into shared execution. The home experience should carry the atmosphere of a memory object or editorial journal, while the operational layers remain clear, stable, and efficient.

### Approved Direction

The approved direction is `Dual-Layer Hybrid`.

This means:

- The first screen leads with emotional signal, relationship presence, and today’s shared story.
- The deeper content transitions into planning, scheduling, rituals, and household coordination.
- The app should support wide feature breadth without flattening into a dashboard mosaic.

## Information Architecture

### Primary Navigation

The app should move to five top-level spaces:

1. `Home`
2. `Calendar`
3. `Space`
4. `Journal`
5. `Profile`

### Navigation Rationale

`Home` is the relationship-centered daily hub. `Calendar` becomes the place for time-based coordination, including events, reminders, anniversaries, and plans. `Space` consolidates practical life management such as tasks, lists, wishlists, expenses, and household workflows. `Journal` remains the reflective memory surface. `Profile` holds couple settings, invite management, notifications, themes, and account controls.

This replaces the current model where reminders and tasks act as independent top-level identities. They become tools inside a broader shared-life product.

### Home Structure

The `Home` screen should be split into two layers:

- `Emotional layer`: partner presence, day framing, featured note or memory, mood/check-in state, next important moment, anniversary or countdown context
- `Operational layer`: upcoming calendar items, tasks due, active rituals, financial pulse, planning shortcuts, and entry points into other modules

The transition between these layers should feel deliberate and smooth. The emotional layer is not a banner on top of a dashboard. It is the leading composition of the screen, and the operational layer resolves from it naturally as the user scrolls.

### Secondary Feature Hierarchy

#### Core features

- shared timeline home
- calendar and event planning
- reminders
- tasks and lists
- rituals and check-ins

#### Strong secondary features

- journal with shared and private entries
- wishlists
- shared expenses
- milestones and countdowns

#### Connective features

- pinned love notes
- weekly review
- date planning
- partner presence signals

These connective features should improve cohesion across the app instead of living as novelty modules.

## Visual System

### Visual Thesis

`Cinematic warmth, soft contrast, tactile depth, and quiet motion.`

The product should feel editorial and intimate, with the first viewport reading more like a poster or journal spread than a stack of mobile components. The planning surfaces below should retain that brand signature while becoming clearer, quieter, and more utility-oriented.

### Mood and Material

- warm blacks instead of pure black
- parchment and bone neutrals instead of pure white
- copper and gold accents
- restrained shadows and depth
- cropped imagery or atmospheric planes where they do narrative work
- strong serif moments paired with disciplined sans text

### Hard Style Rules

- Use at most two typefaces.
- Avoid generic SaaS-style card grids.
- Reduce boxed surfaces substantially.
- Use spacing, scale, and contrast before adding extra chrome.
- Keep one primary accent family, with feature accents only where they improve scanability.
- Do not let decorative elements overpower clarity.

### Native Platform Constraint

The brand system should be shared, but interaction calibration must respect platform norms.

#### iOS

- richer material/blur treatment where appropriate
- sheet-first creation flows
- softer motion curves
- polished transitions and tactile depth

#### Android

- clearer structure and touch targets
- predictable back behavior
- motion tuned to platform expectations
- no iOS-only assumptions in layout, hierarchy, or gestures

The goal is one unmistakable brand with two platform-native interaction calibrations.

## Interaction Model

### Interaction Thesis

The app should use a small number of meaningful motions:

- hero entrance sequence for the home screen
- scroll transition from emotional layer to operational layer
- refined transitions for creating reminders, notes, plans, or rituals

Motion should support presence and hierarchy rather than decoration.

### Core Interaction Principles

- creation flows should feel intentional and focused
- writing and planning should use richer sheet or near-full-screen experiences
- important shared changes should feel immediate
- empty, loading, and error states should feel designed, not incidental

### Native Feel Requirements

- respect keyboard behavior on both platforms
- respect Android back stack and dismissal expectations
- use touch targets and gestures that feel standard for the platform
- avoid web-like UI density or browser-style navigation patterns

## Backend and Data Architecture

### Backend Decision

The app should move fully from `Supabase + direct client table access` to `Convex + typed queries/mutations/actions`.

Convex should become the source of truth for:

- shared data
- real-time updates
- business logic
- derived home timeline composition
- couple-scoped access rules

### Client Architecture

The Expo app should stop owning server data in Zustand stores as the primary source. Instead:

- Convex hooks own server state
- Zustand or local state handles ephemeral UI concerns only
- screens subscribe to typed queries instead of issuing direct table calls
- mutations become explicit domain operations rather than generic CRUD from the client

### Auth Model

The redesign requires real authentication and real shared syncing from day one.

Recommended flow:

- account creation/sign-in through a Convex-supported auth integration
- secure session persistence on-device
- create couple
- create membership
- join couple by invite code

Invite flow should remain lightweight, but the underlying model should be explicit and durable.

### Cutover Strategy

This repository is still early-stage and should treat the migration as a product/backend replacement rather than a live production data migration.

Assumptions for planning:

- existing Supabase code will be removed rather than supported indefinitely in parallel
- no dual-write period is required
- existing local/dev users can be reset if needed during migration
- the implementation plan must choose one concrete auth provider path for Convex and apply it consistently across sign-in, sign-up, session restore, and sign-out

If an existing real user base is discovered later, a separate migration spec is required. It should not be folded into this redesign plan by default.

### Access Boundaries

The couple becomes the root shared boundary. Private content remains visible only to its author even within that couple boundary.

This should support:

- shared reminders
- shared planning objects
- shared lists
- private journal entries
- private check-ins where applicable
- partner-visible shared notes and memories

### Data Model Direction

The current feature-by-feature tables should be rethought around both feature depth and home composition.

Recommended entities:

- `users`
- `couples`
- `memberships`
- `events`
- `plans`
- `rituals`
- `checkIns`
- `reminders`
- `taskLists`
- `tasks`
- `journalEntries`
- `loveNotes`
- `wishlists`
- `wishlistItems`
- `expenses`
- `milestones`
- `timelineItems` or equivalent derived timeline composition model

The critical addition is a composition layer that allows the home timeline to present multiple object types in one ordered narrative without duplicating presentation logic across the client.

### Planning Object Definition

`plans` are first-class shared planning records and should not be collapsed into generic `events`.

Suggested responsibility split:

- `events`: fixed-time calendar items such as reservations, appointments, anniversaries, and scheduled moments
- `plans`: multi-step or evolving shared intentions such as trip planning, date ideas, weekend plans, or goal-driven preparations that may later produce one or more events
- `rituals`: recurring relationship practices such as weekly review, gratitude check-in, or date-night ritual

This distinction matters because `plans` belong both in calendar-adjacent experiences and in the home narrative, but they have different lifecycle rules than point-in-time events.

### Home Timeline Composition Contract

The home timeline should be treated as a derived query contract, not a freeform UI invention.

It must support these item families:

- featured relationship signal
- upcoming event
- active plan
- reminder due today
- task due today
- ritual due or completed
- recent shared note or memory
- milestone or countdown moment

Minimum contract requirements:

- every timeline item has a stable type
- every item exposes source object id and source collection
- items can be filtered by date window and couple
- private records never appear in shared home results
- ordering rules are deterministic

Initial ordering recommendation:

1. featured hero signal selected by app logic
2. overdue items
3. items happening today ordered by time, then importance
4. near-future items within the chosen preview window
5. reflective or memory items

The plan should define where the derived result is computed, how it invalidates after source updates, and whether it is materialized or resolved at query time.

## Feature Scope for First Complete Version

The first complete version should fully ship these areas:

- real auth and invite flow
- shared timeline home
- shared calendar/events/plans
- reminders
- tasks and lists
- rituals/check-ins
- journal with private/shared entries
- wishlists
- shared expenses
- profile/settings/notification shell

### Scope Rule

Every shipped feature must be:

- real-time
- editable
- visually integrated with home or calendar where relevant
- coherent with the overall product language

Avoid modules that exist only as empty destinations or future placeholders.

### Delivery Priority

The first implementation plan should explicitly stage this work into priority bands.

#### Must ship in the first executable phase

- auth and invite flow
- couple membership model
- shared timeline home
- calendar/events/plans foundation
- reminders
- rituals/check-ins

#### Must follow immediately after foundation

- tasks and lists
- journal with private/shared visibility
- profile/settings shell

#### Can land after the core relationship/planning loop is stable

- wishlists
- shared expenses
- milestone depth

This keeps the product direction intact while giving the implementation plan permission to sequence broad scope sensibly.

## Error Handling and Resilience

The product should explicitly design for failure and recovery.

Requirements:

- optimistic updates where latency matters
- clear rollback behavior on failed writes
- visible feedback for invite, auth, and mutation failures
- first-class flows for expired or invalid invite codes
- explicit conflict handling for couple membership edge cases
- designed loading, empty, and error states

Offline tolerance can improve reads where practical, but the app should not misrepresent sync state.

## Testing and Verification

### Domain and Data

- unit tests for Convex domain logic
- tests for access boundaries and shared/private visibility rules
- tests for invite flow and membership creation

### Integration

- onboarding end-to-end
- create shared event/reminder
- complete ritual/check-in
- write private journal entry
- verify partner-visible updates sync correctly

### Platform Verification

Manual verification is required on both iOS and Android for:

- navigation behavior
- sheet behavior
- keyboard interaction
- permission prompts
- notification setup surfaces
- back navigation and dismissal behavior

## Implementation Notes

The current repository already contains:

- Expo Router navigation
- multiple feature screens
- Supabase auth and table access
- Zustand stores for session/profile/couple state
- an initial visual language described in `docs/PRD.md`

The redesign should preserve the useful product intent from the PRD while substantially changing the IA, interaction model, and backend architecture.

The implementation should be split into clear phases rather than attempted as a single undifferentiated rewrite.

Planning guidance:

- Phase 1 should establish Convex auth, couple membership, navigation skeleton, and the home/calendar foundation.
- Phase 2 should make the core relationship loop usable end-to-end with rituals, reminders, and plans.
- Phase 3 should migrate and redesign operational tools such as tasks, journal, and settings.
- Phase 4 should expand into secondary modules such as wishlists and expenses.

## Approved Decisions Summary

- Product direction: `Dual-Layer Hybrid`
- Tone: editorial and romantic
- Core home behavior: shared timeline with dashboard support
- Backend: Convex
- Auth/sync: real from day one
- Feature ambition: relationship, planning, and practical life features all in scope
- Platform requirement: native-feeling on both iOS and Android
