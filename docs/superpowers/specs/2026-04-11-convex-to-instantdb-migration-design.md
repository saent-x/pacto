# Convex to InstantDB Migration — Design Spec

**Date:** 2026-04-11
**Scope:** Full backend migration from Convex to InstantDB for the Coupl app
**Approach:** Single-effort, clean start (no data migration)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Screens (app/)                                  │
│  ─ Minimal changes (auth screens redesigned)     │
│  ─ Still consume hooks with same interfaces      │
├─────────────────────────────────────────────────┤
│  Hook Layer (src/hooks/)                         │
│  ─ Rewrite internals: Convex → InstantDB        │
│  ─ db.useQuery() + db.transact() replaces        │
│    useQuery(makeFunctionReference) + useMutation  │
│  ─ Keep same return shapes where possible        │
├─────────────────────────────────────────────────┤
│  Expo API Routes (app/api/)                      │
│  ─ /api/home+api.ts        (getHomeView)         │
│  ─ /api/calendar+api.ts    (getCalendarView)     │
│  ─ /api/daily-verse+api.ts (ensureDailyVerse)    │
│  ─ Uses @instantdb/admin                         │
├─────────────────────────────────────────────────┤
│  InstantDB                                       │
│  ─ instant.schema.ts (entities + links)          │
│  ─ instant.perms.ts  (CEL permission rules)      │
│  ─ @instantdb/react-native (client)              │
│  ─ @instantdb/admin (API routes)                 │
│  ─ $files for journal media                      │
└─────────────────────────────────────────────────┘
```

### What moves to Expo API Routes (3 endpoints)

- **`getHomeView`** — aggregates 9 tables, builds timeline/hero/milestones/memories
- **`getCalendarView`** — builds monthly calendar grid from the same data
- **`ensureDailyVerse`** — fetches from external Bible API, caches result via admin SDK

### What stays client-side (everything else)

- All CRUD operations (create/update/delete for every feature)
- All simple list queries (events, plans, tasks, etc.)
- Auth flows (InstantDB built-in)
- File uploads (InstantDB `$files`)
- Privacy filtering (client-side in hooks, couple scoping via permission rules)

---

## 2. InstantDB Schema

### Entities

**`$users`** (InstantDB built-in, extended):
- `email`: `i.string().unique().indexed()`
- `displayName`: `i.string()`
- `avatarUrl`: `i.string().optional()`
- `preferences`: `i.json().optional()`

**`couples`**:
- `name`: `i.string()`
- `inviteCode`: `i.string().optional().unique()`
- `anniversary`: `i.string().optional()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`memberships`** (join table: user ↔ couple):
- `role`: `i.string()` — "creator" | "partner"
- `status`: `i.string()` — "active" | "left"
- `joinedAt`: `i.number()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`events`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `startsAt`: `i.number()`
- `endsAt`: `i.number().optional()`
- `category`: `i.string().optional()`
- `location`: `i.string().optional()`
- `priority`: `i.number()`
- `isPrivate`: `i.boolean()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`plans`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `category`: `i.string().optional()`
- `targetDate`: `i.string().optional()`
- `budget`: `i.number().optional()`
- `status`: `i.string()` — "active", "done", "completed", "cancelled"
- `notes`: `i.string().optional()`
- `coverImageUrl`: `i.string().optional()`
- `priority`: `i.number()`
- `isPrivate`: `i.boolean()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`rituals`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `cadence`: `i.string()` — "daily", "weekly", "monthly", etc.
- `dueDate`: `i.string().optional()`
- `nextOccurrenceAt`: `i.number().optional()`
- `lastCompletedAt`: `i.number().optional()`
- `streak`: `i.number()`
- `priority`: `i.number()`
- `isPrivate`: `i.boolean()`
- `isActive`: `i.boolean()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`checkIns`**:
- `mood`: `i.string().optional()`
- `note`: `i.string().optional()`
- `checkInDate`: `i.string()` — YYYY-MM-DD
- `isPrivate`: `i.boolean()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`reminders`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `dueAt`: `i.number().indexed()`
- `recurrence`: `i.string().optional()`
- `isCompleted`: `i.boolean()`
- `completedAt`: `i.number().optional()`
- `priority`: `i.number()`
- `category`: `i.string().optional()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`tasks`** (simplified — no more taskLists):
- `title`: `i.string()`
- `notes`: `i.string().optional()`
- `category`: `i.string().optional()` — replaces taskLists entity
- `isCompleted`: `i.boolean()`
- `completedAt`: `i.number().optional()`
- `dueDate`: `i.string().optional()`
- `priority`: `i.number()`
- `sortOrder`: `i.number()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`journalEntries`**:
- `title`: `i.string().optional()`
- `body`: `i.string()`
- `mood`: `i.string().optional()`
- `isPrivate`: `i.boolean()`
- `tags`: `i.json()` — array of strings
- `entryDate`: `i.string()` — YYYY-MM-DD
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`loveNotes`**:
- `body`: `i.string()`
- `isPrivate`: `i.boolean()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

**`wishlists`**:
- `name`: `i.string()`
- `createdAt`: `i.number()`

**`wishlistItems`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `url`: `i.string().optional()`
- `price`: `i.number().optional()`
- `isPurchased`: `i.boolean()`
- `priority`: `i.number()`
- `sortOrder`: `i.number()`
- `createdAt`: `i.number()`

**`expenses`**:
- `title`: `i.string()`
- `amount`: `i.number()`
- `currency`: `i.string().optional()` — defaults to "USD" client-side
- `splitType`: `i.string()` — e.g., "even"
- `splitAmount`: `i.number().optional()`
- `category`: `i.string()`
- `date`: `i.string()` — YYYY-MM-DD
- `isSettled`: `i.boolean()`
- `createdAt`: `i.number()`

**`milestones`**:
- `title`: `i.string()`
- `description`: `i.string().optional()`
- `date`: `i.string()` — YYYY-MM-DD
- `icon`: `i.string()`
- `createdAt`: `i.number()`

**`dailyVerseCache`**:
- `dateKey`: `i.string().unique().indexed()` — YYYY-MM-DD
- `text`: `i.string()`
- `reference`: `i.string()`
- `translation`: `i.string()`
- `source`: `i.string()` — "remote" | "fallback"
- `fetchedAt`: `i.number()`
- `createdAt`: `i.number()`
- `updatedAt`: `i.number()`

### Links

```typescript
links: {
  // Couple ↔ User (creator)
  coupleCreator: {
    forward: { on: 'couples', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdCouples' },
  },

  // Membership ↔ User & Couple (join table)
  membershipUser: {
    forward: { on: 'memberships', has: 'one', label: 'user' },
    reverse: { on: '$users', has: 'many', label: 'memberships' },
  },
  membershipCouple: {
    forward: { on: 'memberships', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'memberships' },
  },

  // Events
  eventCouple: {
    forward: { on: 'events', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'events' },
  },
  eventCreator: {
    forward: { on: 'events', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdEvents' },
  },

  // Plans
  planCouple: {
    forward: { on: 'plans', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'plans' },
  },
  planCreator: {
    forward: { on: 'plans', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdPlans' },
  },

  // Rituals
  ritualCouple: {
    forward: { on: 'rituals', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'rituals' },
  },
  ritualCreator: {
    forward: { on: 'rituals', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdRituals' },
  },

  // Check-ins
  checkInCouple: {
    forward: { on: 'checkIns', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'checkIns' },
  },
  checkInAuthor: {
    forward: { on: 'checkIns', has: 'one', label: 'author' },
    reverse: { on: '$users', has: 'many', label: 'checkIns' },
  },

  // Reminders
  reminderCouple: {
    forward: { on: 'reminders', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'reminders' },
  },
  reminderCreator: {
    forward: { on: 'reminders', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdReminders' },
  },
  reminderAssignee: {
    forward: { on: 'reminders', has: 'one', label: 'assignedTo' },
    reverse: { on: '$users', has: 'many', label: 'assignedReminders' },
  },
  reminderCompletedBy: {
    forward: { on: 'reminders', has: 'one', label: 'completedBy' },
    reverse: { on: '$users', has: 'many', label: 'completedReminders' },
  },

  // Tasks
  taskCouple: {
    forward: { on: 'tasks', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'tasks' },
  },
  taskCreator: {
    forward: { on: 'tasks', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdTasks' },
  },
  taskAssignee: {
    forward: { on: 'tasks', has: 'one', label: 'assignedTo' },
    reverse: { on: '$users', has: 'many', label: 'assignedTasks' },
  },
  taskCompletedBy: {
    forward: { on: 'tasks', has: 'one', label: 'completedBy' },
    reverse: { on: '$users', has: 'many', label: 'completedTasks' },
  },

  // Journal Entries
  journalCouple: {
    forward: { on: 'journalEntries', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'journalEntries' },
  },
  journalAuthor: {
    forward: { on: 'journalEntries', has: 'one', label: 'author' },
    reverse: { on: '$users', has: 'many', label: 'journalEntries' },
  },
  journalMedia: {
    forward: { on: 'journalEntries', has: 'many', label: 'media' },
    reverse: { on: '$files', has: 'one', label: 'journalEntry' },
  },

  // Love Notes
  loveNoteCouple: {
    forward: { on: 'loveNotes', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'loveNotes' },
  },
  loveNoteAuthor: {
    forward: { on: 'loveNotes', has: 'one', label: 'author' },
    reverse: { on: '$users', has: 'many', label: 'loveNotes' },
  },

  // Wishlists
  wishlistCouple: {
    forward: { on: 'wishlists', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'wishlists' },
  },
  wishlistCreator: {
    forward: { on: 'wishlists', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdWishlists' },
  },

  // Wishlist Items
  wishlistItemWishlist: {
    forward: { on: 'wishlistItems', has: 'one', label: 'wishlist' },
    reverse: { on: 'wishlists', has: 'many', label: 'items', onDelete: 'cascade' },
  },
  wishlistItemCouple: {
    forward: { on: 'wishlistItems', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'wishlistItems' },
  },
  wishlistItemAddedBy: {
    forward: { on: 'wishlistItems', has: 'one', label: 'addedBy' },
    reverse: { on: '$users', has: 'many', label: 'addedWishlistItems' },
  },
  wishlistItemPurchasedBy: {
    forward: { on: 'wishlistItems', has: 'one', label: 'purchasedBy' },
    reverse: { on: '$users', has: 'many', label: 'purchasedWishlistItems' },
  },

  // Expenses
  expenseCouple: {
    forward: { on: 'expenses', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'expenses' },
  },
  expensePaidBy: {
    forward: { on: 'expenses', has: 'one', label: 'paidBy' },
    reverse: { on: '$users', has: 'many', label: 'paidExpenses' },
  },

  // Milestones
  milestoneCouple: {
    forward: { on: 'milestones', has: 'one', label: 'couple' },
    reverse: { on: 'couples', has: 'many', label: 'milestones' },
  },
  milestoneCreator: {
    forward: { on: 'milestones', has: 'one', label: 'createdBy' },
    reverse: { on: '$users', has: 'many', label: 'createdMilestones' },
  },
}
```

### Design Decisions

- **Memberships as explicit join table** — carries `role`, `status`, `joinedAt` data; not a simple many-to-many
- **Cascade deletes** on wishlist → wishlistItems (matches current behavior)
- **taskLists removed** — replaced by `category` string field on tasks
- **`$users`** extended with app-specific fields (`displayName`, `avatarUrl`, `preferences`)
- **`$files`** linked to journalEntries for media
- **`dailyVerseCache`** standalone with `dateKey` unique+indexed

---

## 3. Authentication

### Auth Method

InstantDB built-in auth replacing Better Auth. Primary flow: **magic codes** (email → code → verify).

### Auth Flow

```
User enters email
  → db.auth.sendMagicCode({ email })
  → User receives code via email
  → db.auth.signInWithMagicCode({ email, code })
  → InstantDB creates/authenticates $user
  → db.useAuth() returns { user }
  → useSession queries memberships for active couple
  → Route determined: sign-in | onboarding | home
```

### Hook Changes

**`useSession`** — rewired to:
- `db.useAuth()` for auth state (replaces `authClient.useSession()` + `useConvexAuth()`)
- `db.useQuery({ memberships: { ... } })` for active couple (replaces `useQuery(getCurrentSessionUser)`)
- Same `SessionValue` return type, same route logic

**`useAuthActions`** — rewired to:
- `signIn` → `db.auth.sendMagicCode({ email })` (returns void, UI shows code input)
- `verifyCode` → `db.auth.signInWithMagicCode({ email, code })` (new method)
- `signUp` → same magic code flow (user auto-created on first verification)
- `signOut` → `db.auth.signOut()`
- `createCouple` → `db.transact()` to create couple + membership + links
- `joinCoupleByInviteCode` → query couple by code, create membership, nullify code

### Screen Changes

- **`sign-in.tsx`** — redesigned: two-step flow (email → code) instead of email+password
- **`sign-up.tsx`** — may merge with sign-in since magic codes handle both new and returning users
- **`onboarding.tsx`** — mostly unchanged
- **`invite.tsx`** — unchanged

### Properties at Signup

Use InstantDB's signup property setting to store `displayName` on the `$users` entity during first magic code verification.

---

## 4. Permissions

Declarative CEL rules in `instant.perms.ts` replacing Convex function-level auth checks.

### Strategy

- **Couple scoping** — enforced via permission rules (isMember check)
- **Privacy filtering** — handled client-side in hooks (simpler than complex CEL, matches current pattern)
- **Schema locking** — `attrs.$default: 'false'` prevents runtime schema changes

### Rules

```typescript
const rules = {
  attrs: { allow: { $default: 'false' } },

  couples: {
    allow: {
      view: 'isMember',
      create: 'auth.id != null',
      update: 'isMember',
      delete: 'false',
    },
    bind: {
      isMember: "auth.ref('$user.memberships.couple.id').includes(data.id) == true",
    },
  },

  memberships: {
    allow: {
      view: 'isSelf || isCouplemate',
      create: 'auth.id != null',
      update: 'isSelf',
      delete: 'false',
    },
    bind: {
      isSelf: "auth.id == data.ref('user.id')",
      isCouplemate: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true",
    },
  },

  // All couple-scoped feature tables use the same isMember pattern.
  // Listed explicitly below:
  events: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  plans: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  rituals: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  checkIns: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  reminders: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  tasks: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  journalEntries: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  loveNotes: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  wishlists: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  wishlistItems: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  expenses: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },
  milestones: {
    allow: { view: 'isMember', create: 'isMember', update: 'isMember', delete: 'isMember' },
    bind: { isMember: "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true" },
  },

  $files: {
    allow: { view: 'auth.id != null', create: 'auth.id != null', delete: 'auth.id != null' },
  },

  dailyVerseCache: {
    allow: { view: 'auth.id != null', create: 'false', update: 'false', delete: 'false' },
  },
};
```

---

## 5. Hook Layer Migration

### Pattern

All hooks rewrite their internals from Convex to InstantDB while preserving the same return interface. Screens should not need changes (except auth screens).

### Universal Translation

| Convex Pattern | InstantDB Pattern |
|---|---|
| `useQuery(ref, activeCouple ? {} : 'skip')` | `db.useQuery(coupleId ? { table: { $: { where: { 'couple.id': coupleId } } } } : null)` |
| `useMutation(ref)(args)` | `db.transact(db.tx.table[id()].update(args).link({...}))` |
| `useAction(ref)(args)` | `fetch('/api/endpoint')` |
| `convex.query(ref, {})` (refetch) | `db.queryOnce({ ... })` or re-render triggers |
| `makeFunctionReference<...>(...)` | removed — direct `db` calls |

### Hook Complexity Map

| Hook | Complexity | Key Changes |
|---|---|---|
| `useSession` | High | Rewire auth + membership query |
| `useAuthActions` | High | Magic code flow, couple create/join |
| `useHomeTimeline` | Medium | `fetch('/api/home')` instead of single Convex query |
| `useCalendar` | Medium | `fetch('/api/calendar')` |
| `useTasks` | Medium | Simplified (no lists), direct queries with category |
| `useJournal` | Medium | File uploads via `db.storage.uploadFile()`, encryption stays |
| `useCheckIns` | Low | Straightforward query + transact |
| `useReminders` | Low | Straightforward |
| `useLoveNotes` | Low | Straightforward |
| `usePlans` | Low | Straightforward |
| `useWishlists` | Low | Two entities with link queries |
| `useExpenses` | Low | Straightforward |
| `useMilestones` | Low | Straightforward |

### Interface Changes Screens Will Feel

- **Tasks**: `lists` property removed from return. `taskFeed` items have `category: string | null` instead of `list: TaskListSummary | null`. `createList`, `deleteList`, `getListCounts` removed. Task screens need UI updates for category-based grouping.
- **Auth screens**: two-step magic code flow (email → code input)
- **Everything else**: identical return shapes

### Type Conversion Layer

Current hooks convert Convex camelCase docs to snake_case `types/database.ts` types. With InstantDB, data comes back camelCase natively.

**Decision:** Keep the conversion functions during migration to minimize screen changes. The hooks will convert InstantDB's camelCase responses to the existing snake_case types that screens expect. This can be cleaned up in a follow-up effort after the migration is stable.

---

## 6. Expo API Routes

### Endpoints

**`app/api/home+api.ts`** — GET
1. Verify auth token from `Authorization` header via `db.auth.verifyToken()`
2. Query user's active membership + couple
3. Query all 9 feature tables for the couple in a single `db.query()` call
4. Pass data through `buildHomeView()` pure functions
5. Return `HomeView` JSON

**`app/api/calendar+api.ts`** — GET
- Query params: `month`, `selectedDate`
- Same auth + couple resolution
- Uses same builders with wider preview window
- Returns `CalendarView` JSON

**`app/api/daily-verse+api.ts`** — POST
1. Fetch from `https://labs.bible.org/api/?passage=votd&type=json`
2. Upsert into `dailyVerseCache` via admin SDK `db.transact()`
3. Return verse JSON
4. Falls back to curated list on fetch failure

### Shared Logic Extraction

Pure functions from `convex/timeline.ts` (~400 lines) extracted to:

```
src/lib/home/
  builders.ts   — buildTimelineItems, buildMilestones, selectFeaturedSignal,
                   buildCalendarDays, buildMemoryPreview, normalizePresence
  types.ts      — HomeView, TimelineItem, CalendarView, FeaturedSignal,
                   MilestoneStripItem, MemoryPreview, CalendarDay
```

These are pure functions — no Convex or InstantDB imports. They take data arrays and return structured output.

### Client Auth Token Passing

Hooks calling API routes pass the InstantDB user token:

```typescript
const user = await db.getAuth();
fetch('/api/home', { headers: { Authorization: `Bearer ${user?._token}` } });
```

---

## 7. Provider & Initialization

### InstantDB Client Singleton

```typescript
// src/lib/instant.ts
import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  schema,
});

export { db };
```

No React provider needed — `db` is a singleton imported directly.

### Updated AppProviders

```typescript
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
```

`ConvexBetterAuthProvider` removed.

---

## 8. File Changes Summary

### Files Deleted

- `convex/` — entire directory
- `src/lib/convex.ts`
- `src/lib/auth-client.ts`

### Files Created

- `instant.schema.ts` — schema definition
- `instant.perms.ts` — permission rules
- `src/lib/instant.ts` — db singleton
- `app/api/home+api.ts` — home view API route
- `app/api/calendar+api.ts` — calendar view API route
- `app/api/daily-verse+api.ts` — daily verse API route
- `src/lib/home/builders.ts` — extracted pure timeline/calendar builder functions
- `src/lib/home/types.ts` — shared type definitions

### Files Modified

- `src/providers/AppProviders.tsx` — remove Convex provider
- `src/hooks/useSession.ts` — rewire to InstantDB auth + queries
- `src/hooks/useAuthActions.ts` — magic code flow
- `src/hooks/useHomeTimeline.ts` — fetch from API route
- `src/hooks/useCalendar.ts` — fetch from API route
- `src/hooks/useTasks.ts` — simplified, no lists, InstantDB queries
- `src/hooks/useJournal.ts` — InstantDB storage for uploads
- `src/hooks/useCheckIns.ts` — InstantDB queries
- `src/hooks/useReminders.ts` — InstantDB queries
- `src/hooks/useLoveNotes.ts` — InstantDB queries
- `src/hooks/usePlans.ts` — InstantDB queries
- `src/hooks/useWishlists.ts` — InstantDB queries
- `src/hooks/useExpenses.ts` — InstantDB queries
- `src/hooks/useMilestones.ts` — InstantDB queries
- `app/(auth)/sign-in.tsx` — magic code two-step flow
- `app/(auth)/sign-up.tsx` — may merge with sign-in
- `app/(tabs)/more/edit-profile.tsx` — InstantDB user update
- `app/(tabs)/more/couple-settings.tsx` — InstantDB mutations
- `app/(tabs)/more/index.tsx` — delete account via InstantDB
- `app/(tabs)/calendar/index.tsx` — InstantDB mutations
- `src/types/database.ts` — update Task type (remove list_id, add category)
- `package.json` — swap dependencies

### Environment Variables

- **Remove**: `EXPO_PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`, `CONVEX_SITE_URL`
- **Add**: `EXPO_PUBLIC_INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`

### Package Changes

- **Remove**: `convex`, `@convex-dev/better-auth`, `better-auth`
- **Add**: `@instantdb/react-native`, `@instantdb/admin`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `react-native-get-random-values`
