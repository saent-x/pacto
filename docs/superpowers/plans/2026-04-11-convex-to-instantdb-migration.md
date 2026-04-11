# Convex to InstantDB Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire Convex backend with InstantDB, including schema, auth, permissions, all hooks, and API routes.

**Architecture:** Client-centric InstantDB with `@instantdb/react-native` for real-time queries/mutations, `@instantdb/admin` in Expo API Routes for composite aggregation (home timeline, calendar, daily verse), and InstantDB built-in auth (magic codes) replacing Better Auth.

**Tech Stack:** InstantDB, Expo Router API Routes, React Native, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-11-convex-to-instantdb-migration-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `instant.schema.ts` | InstantDB schema definition (entities + links) |
| `instant.perms.ts` | CEL permission rules |
| `src/lib/instant.ts` | InstantDB client singleton (`db`) |
| `src/lib/home/builders.ts` | Pure functions extracted from `convex/timeline.ts` |
| `src/lib/home/types.ts` | Shared types for HomeView, CalendarView, TimelineItem, etc. |
| `app/api/home+api.ts` | Expo API route for home timeline aggregation |
| `app/api/calendar+api.ts` | Expo API route for calendar view |
| `app/api/daily-verse+api.ts` | Expo API route for daily verse fetch + cache |

### Modified Files

| File | Change |
|---|---|
| `package.json` | Swap Convex/Better Auth deps for InstantDB |
| `src/providers/AppProviders.tsx` | Remove ConvexBetterAuthProvider |
| `src/types/database.ts` | Update Task type (remove list_id, add category) |
| `src/hooks/useSession.ts` | Rewire to `db.useAuth()` + InstantDB queries |
| `src/hooks/useAuthActions.ts` | Magic code flow, couple create/join via transact |
| `src/hooks/useHomeTimeline.ts` | Fetch from `/api/home` |
| `src/hooks/useCalendar.ts` | Fetch from `/api/calendar` |
| `src/hooks/useTasks.ts` | Simplified (no lists), InstantDB queries |
| `src/hooks/useJournal.ts` | InstantDB storage for uploads |
| `src/hooks/useCheckIns.ts` | InstantDB queries |
| `src/hooks/useReminders.ts` | InstantDB queries |
| `src/hooks/useLoveNotes.ts` | InstantDB queries |
| `src/hooks/usePlans.ts` | InstantDB queries |
| `src/hooks/useWishlists.ts` | InstantDB queries |
| `src/hooks/useExpenses.ts` | InstantDB queries |
| `src/hooks/useMilestones.ts` | InstantDB queries |

### Deleted Files

| File/Directory | Reason |
|---|---|
| `convex/` | Entire Convex backend replaced |
| `src/lib/convex.ts` | Convex client singleton no longer needed |
| `src/lib/auth-client.ts` | Better Auth client no longer needed |

---

## Task 1: Install Dependencies and Set Up InstantDB

**Files:**
- Modify: `package.json`
- Create: `instant.schema.ts`
- Create: `instant.perms.ts`
- Create: `src/lib/instant.ts`

- [ ] **Step 1: Remove Convex and Better Auth packages**

```bash
npm uninstall convex @convex-dev/better-auth better-auth @better-auth/expo
```

- [ ] **Step 2: Install InstantDB packages**

```bash
npm install @instantdb/react-native @instantdb/admin @react-native-community/netinfo react-native-get-random-values
```

Note: `@react-native-async-storage/async-storage` is already installed.

- [ ] **Step 3: Remove Convex scripts from package.json**

In `package.json`, remove these scripts:
```json
"convex:dev": "convex dev",
"convex:deploy": "convex deploy"
```

- [ ] **Step 4: Create `instant.schema.ts`**

Create at project root:

```typescript
import { i } from '@instantdb/react-native';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string(),
      avatarUrl: i.string().optional(),
      preferences: i.json().optional(),
    }),
    couples: i.entity({
      name: i.string(),
      inviteCode: i.string().optional().unique(),
      anniversary: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    memberships: i.entity({
      role: i.string(),
      status: i.string(),
      joinedAt: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    events: i.entity({
      title: i.string(),
      description: i.string().optional(),
      startsAt: i.number(),
      endsAt: i.number().optional(),
      category: i.string().optional(),
      location: i.string().optional(),
      priority: i.number(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    plans: i.entity({
      title: i.string(),
      description: i.string().optional(),
      category: i.string().optional(),
      targetDate: i.string().optional(),
      budget: i.number().optional(),
      status: i.string(),
      notes: i.string().optional(),
      coverImageUrl: i.string().optional(),
      priority: i.number(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    rituals: i.entity({
      title: i.string(),
      description: i.string().optional(),
      cadence: i.string(),
      dueDate: i.string().optional(),
      nextOccurrenceAt: i.number().optional(),
      lastCompletedAt: i.number().optional(),
      streak: i.number(),
      priority: i.number(),
      isPrivate: i.boolean(),
      isActive: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    checkIns: i.entity({
      mood: i.string().optional(),
      note: i.string().optional(),
      checkInDate: i.string(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    reminders: i.entity({
      title: i.string(),
      description: i.string().optional(),
      dueAt: i.number().indexed(),
      recurrence: i.string().optional(),
      isCompleted: i.boolean(),
      completedAt: i.number().optional(),
      priority: i.number(),
      category: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    tasks: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      category: i.string().optional(),
      isCompleted: i.boolean(),
      completedAt: i.number().optional(),
      dueDate: i.string().optional(),
      priority: i.number(),
      sortOrder: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    journalEntries: i.entity({
      title: i.string().optional(),
      body: i.string(),
      mood: i.string().optional(),
      isPrivate: i.boolean(),
      tags: i.json(),
      entryDate: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    loveNotes: i.entity({
      body: i.string(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    wishlists: i.entity({
      name: i.string(),
      createdAt: i.number(),
    }),
    wishlistItems: i.entity({
      title: i.string(),
      description: i.string().optional(),
      url: i.string().optional(),
      price: i.number().optional(),
      isPurchased: i.boolean(),
      priority: i.number(),
      sortOrder: i.number(),
      createdAt: i.number(),
    }),
    expenses: i.entity({
      title: i.string(),
      amount: i.number(),
      currency: i.string().optional(),
      splitType: i.string(),
      splitAmount: i.number().optional(),
      category: i.string(),
      date: i.string(),
      isSettled: i.boolean(),
      createdAt: i.number(),
    }),
    milestones: i.entity({
      title: i.string(),
      description: i.string().optional(),
      date: i.string(),
      icon: i.string(),
      createdAt: i.number(),
    }),
    dailyVerseCache: i.entity({
      dateKey: i.string().unique().indexed(),
      text: i.string(),
      reference: i.string(),
      translation: i.string(),
      source: i.string(),
      fetchedAt: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
  },
  links: {
    coupleCreator: {
      forward: { on: 'couples', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdCouples' },
    },
    membershipUser: {
      forward: { on: 'memberships', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memberships' },
    },
    membershipCouple: {
      forward: { on: 'memberships', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'memberships' },
    },
    eventCouple: {
      forward: { on: 'events', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'events' },
    },
    eventCreator: {
      forward: { on: 'events', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdEvents' },
    },
    planCouple: {
      forward: { on: 'plans', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'plans' },
    },
    planCreator: {
      forward: { on: 'plans', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdPlans' },
    },
    ritualCouple: {
      forward: { on: 'rituals', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'rituals' },
    },
    ritualCreator: {
      forward: { on: 'rituals', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdRituals' },
    },
    checkInCouple: {
      forward: { on: 'checkIns', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'checkIns' },
    },
    checkInAuthor: {
      forward: { on: 'checkIns', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'checkIns' },
    },
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
    loveNoteCouple: {
      forward: { on: 'loveNotes', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'loveNotes' },
    },
    loveNoteAuthor: {
      forward: { on: 'loveNotes', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'loveNotes' },
    },
    wishlistCouple: {
      forward: { on: 'wishlists', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'wishlists' },
    },
    wishlistCreator: {
      forward: { on: 'wishlists', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdWishlists' },
    },
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
    expenseCouple: {
      forward: { on: 'expenses', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'expenses' },
    },
    expensePaidBy: {
      forward: { on: 'expenses', has: 'one', label: 'paidBy' },
      reverse: { on: '$users', has: 'many', label: 'paidExpenses' },
    },
    milestoneCouple: {
      forward: { on: 'milestones', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'milestones' },
    },
    milestoneCreator: {
      forward: { on: 'milestones', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdMilestones' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
```

- [ ] **Step 5: Create `instant.perms.ts`**

Create at project root:

```typescript
import type { InstantRules } from '@instantdb/react-native';

const isMemberBind = {
  isMember:
    "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true",
};

const coupleScoped = {
  allow: {
    view: 'isMember',
    create: 'isMember',
    update: 'isMember',
    delete: 'isMember',
  },
  bind: isMemberBind,
};

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
      isMember:
        "auth.ref('$user.memberships.couple.id').includes(data.id) == true",
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
      isCouplemate:
        "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true",
    },
  },

  events: coupleScoped,
  plans: coupleScoped,
  rituals: coupleScoped,
  checkIns: coupleScoped,
  reminders: coupleScoped,
  tasks: coupleScoped,
  journalEntries: coupleScoped,
  loveNotes: coupleScoped,
  wishlists: coupleScoped,
  wishlistItems: coupleScoped,
  expenses: coupleScoped,
  milestones: coupleScoped,

  $files: {
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },

  dailyVerseCache: {
    allow: {
      view: 'auth.id != null',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },
} satisfies InstantRules;

export default rules;
```

- [ ] **Step 6: Create `src/lib/instant.ts`**

```typescript
import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  schema,
});

export { db };
export { id } from '@instantdb/react-native';
```

- [ ] **Step 7: Commit**

```bash
git add instant.schema.ts instant.perms.ts src/lib/instant.ts package.json package-lock.json
git commit -m "feat: add InstantDB schema, permissions, and client setup"
```

---

## Task 2: Remove Convex Infrastructure and Update Provider

**Files:**
- Delete: `convex/` (entire directory)
- Delete: `src/lib/convex.ts`
- Delete: `src/lib/auth-client.ts`
- Modify: `src/providers/AppProviders.tsx`

- [ ] **Step 1: Delete the `convex/` directory**

```bash
rm -rf convex/
```

- [ ] **Step 2: Delete Convex client and auth client**

```bash
rm src/lib/convex.ts src/lib/auth-client.ts
```

- [ ] **Step 3: Rewrite `src/providers/AppProviders.tsx`**

Replace the entire file contents with:

```typescript
import type { ReactNode } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { SessionProvider } from '@/src/hooks/useSession';
import { ThemeProvider } from '@/src/lib/theme';

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

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Convex backend and Better Auth infrastructure"
```

---

## Task 3: Update Database Types

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Rewrite `src/types/database.ts`**

Replace the entire file contents with:

```typescript
/**
 * Adapter-layer types used by frontend hooks to bridge InstantDB camelCase
 * documents to the snake_case row format expected by UI components.
 */

export type Task = {
  id: string;
  couple_id: string;
  title: string;
  notes: string | null;
  category: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: number;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  couple_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_at: string;
  recurrence: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  priority: number;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntry = {
  id: string;
  couple_id: string;
  author_id: string;
  title: string | null;
  body: string;
  mood: string | null;
  is_private: boolean;
  media_urls: string[];
  tags: string[];
  entry_date: string;
  created_at: string;
  updated_at: string;
};

/**
 * Minimal Database type for the TaskUpdateInput pattern used in useTasks.
 */
export type Database = {
  public: {
    Tables: {
      tasks: {
        Update: Partial<Omit<Task, 'id'>>;
      };
    };
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "refactor: update database types for InstantDB (remove TaskList, add category to Task)"
```

---

## Task 4: Rewrite Auth Hooks (useSession + useAuthActions)

**Files:**
- Modify: `src/hooks/useSession.ts`
- Modify: `src/hooks/useAuthActions.ts`

- [ ] **Step 1: Rewrite `src/hooks/useSession.ts`**

Replace the entire file contents with:

```typescript
import type { ReactNode } from 'react';
import { createContext, createElement, useContext, useMemo } from 'react';
import { db } from '@/src/lib/instant';

export type SessionRoute =
  | '/(auth)/sign-in'
  | '/(auth)/onboarding'
  | '/(tabs)/home';

type SessionValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  route: SessionRoute | null;
  user: { id: string; email: string } | null;
  session: {
    profile: { id: string; displayName: string; avatarUrl: string | null; email: string };
    activeCouple: {
      couple: { id: string; name: string; anniversary: string | null };
      membership: { id: string; userId: string; role: string };
      memberCount: number;
      partner: { id: string; displayName: string; avatarUrl: string | null } | null;
    };
  } | null;
  profile: SessionValue['session'] extends null ? null : NonNullable<SessionValue['session']>['profile'];
  activeCouple: SessionValue['session'] extends null ? null : NonNullable<SessionValue['session']>['activeCouple'];
  refetch: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function getSessionRoute({
  isAuthenticated,
  hasActiveCouple,
}: {
  isAuthenticated: boolean;
  hasActiveCouple: boolean;
}): SessionRoute {
  if (!isAuthenticated) {
    return '/(auth)/sign-in';
  }

  if (!hasActiveCouple) {
    return '/(auth)/onboarding';
  }

  return '/(tabs)/home';
}

function useSessionValue(): SessionValue {
  const { isLoading: authLoading, user, error } = db.useAuth();

  const { isLoading: membershipLoading, data: membershipData } = db.useQuery(
    user
      ? {
          memberships: {
            $: { where: { 'user.id': user.id, status: 'active' } },
            couple: {},
            user: {},
          },
        }
      : null,
  );

  const activeMembership = membershipData?.memberships?.[0] ?? null;
  const couple = activeMembership?.couple?.[0] ?? null;
  const memberUser = activeMembership?.user?.[0] ?? null;

  // Query partner info if we have a couple
  const coupleId = couple?.id ?? null;
  const { data: coupleData } = db.useQuery(
    coupleId
      ? {
          memberships: {
            $: { where: { 'couple.id': coupleId, status: 'active' } },
            user: {},
          },
        }
      : null,
  );

  const allMembers = coupleData?.memberships ?? [];
  const partner = useMemo(() => {
    if (!user) return null;
    const partnerMembership = allMembers.find(
      (m) => m.user?.[0]?.id !== user.id,
    );
    const partnerUser = partnerMembership?.user?.[0] ?? null;
    if (!partnerUser) return null;
    return {
      id: partnerUser.id,
      displayName: (partnerUser as any).displayName ?? partnerUser.email ?? 'Partner',
      avatarUrl: (partnerUser as any).avatarUrl ?? null,
    };
  }, [allMembers, user]);

  const isAuthenticated = !!user;
  const hasActiveCouple = !!couple;
  const isLoading = authLoading || (isAuthenticated && membershipLoading);

  const profile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      displayName: (user as any).displayName ?? user.email ?? '',
      avatarUrl: (user as any).avatarUrl ?? null,
      email: user.email ?? '',
    };
  }, [user]);

  const activeCouple = useMemo(() => {
    if (!couple || !activeMembership || !user) return null;
    return {
      couple: {
        id: couple.id,
        name: couple.name,
        anniversary: couple.anniversary ?? null,
      },
      membership: {
        id: activeMembership.id,
        userId: user.id,
        role: activeMembership.role,
      },
      memberCount: allMembers.length,
      partner,
    };
  }, [couple, activeMembership, user, allMembers.length, partner]);

  const session = useMemo(() => {
    if (!profile || !activeCouple) return null;
    return { profile, activeCouple };
  }, [profile, activeCouple]);

  return {
    isLoading,
    isAuthenticated,
    route: isLoading
      ? null
      : getSessionRoute({ isAuthenticated, hasActiveCouple }),
    user: user ? { id: user.id, email: user.email ?? '' } : null,
    session,
    profile,
    activeCouple,
    refetch: async () => {
      // InstantDB queries are reactive — no manual refetch needed.
      // This is kept for interface compatibility.
    },
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionValue();

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return context;
}
```

- [ ] **Step 2: Rewrite `src/hooks/useAuthActions.ts`**

Replace the entire file contents with:

```typescript
import { db, id } from '@/src/lib/instant';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useAuthActions() {
  const { user } = db.useAuth();

  return {
    sendMagicCode: async (email: string) => {
      await db.auth.sendMagicCode({ email: email.trim().toLowerCase() });
    },
    signInWithMagicCode: async (input: { email: string; code: string }) => {
      await db.auth.signInWithMagicCode({
        email: input.email.trim().toLowerCase(),
        code: input.code,
      });
    },
    signOut: async () => {
      db.auth.signOut();
    },
    createCouple: async (input: { name: string; anniversary?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const coupleId = id();
      const membershipId = id();
      const now = Date.now();
      const inviteCode = generateInviteCode();

      await db.transact([
        db.tx.couples[coupleId]
          .update({
            name: input.name,
            inviteCode,
            anniversary: input.anniversary ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ createdBy: user.id }),
        db.tx.memberships[membershipId]
          .update({
            role: 'creator',
            status: 'active',
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .link({ user: user.id, couple: coupleId }),
      ]);

      return {
        couple: { id: coupleId, name: input.name },
        membership: { id: membershipId },
        inviteCode,
      };
    },
    joinCoupleByInviteCode: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');

      const { couples } = await db.queryOnce({
        couples: { $: { where: { inviteCode: inviteCode.trim().toUpperCase() } } },
      });

      const couple = couples[0];
      if (!couple) throw new Error('Invalid invite code.');

      const membershipId = id();
      const now = Date.now();

      await db.transact([
        db.tx.memberships[membershipId]
          .update({
            role: 'partner',
            status: 'active',
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .link({ user: user.id, couple: couple.id }),
        db.tx.couples[couple.id].update({
          inviteCode: undefined,
          updatedAt: now,
        }),
      ]);
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSession.ts src/hooks/useAuthActions.ts
git commit -m "feat: rewrite auth hooks for InstantDB (magic code flow + session)"
```

---

## Task 5: Rewrite Simple CRUD Hooks (Batch 1 — Plans, Milestones, Expenses, Love Notes)

**Files:**
- Modify: `src/hooks/usePlans.ts`
- Modify: `src/hooks/useMilestones.ts`
- Modify: `src/hooks/useExpenses.ts`
- Modify: `src/hooks/useLoveNotes.ts`

- [ ] **Step 1: Rewrite `src/hooks/usePlans.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

export type PlanInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  budget?: number | null;
  status?: string;
  priority?: number;
  isPrivate?: boolean;
};

export function usePlans(statuses?: string[]) {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { plans: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const plans = useMemo(() => {
    const raw = data?.plans ?? [];
    if (!statuses || statuses.length === 0) return raw;
    return raw.filter((p) => statuses.includes(p.status));
  }, [data?.plans, statuses]);

  const create = useCallback(
    async (input: PlanInput) => {
      if (!coupleId || !user) return;
      const planId = id();
      const now = Date.now();
      await db.transact(
        db.tx.plans[planId]
          .update({
            title: input.title,
            description: input.description ?? undefined,
            category: input.category ?? undefined,
            targetDate: input.targetDate ?? undefined,
            budget: input.budget ?? undefined,
            status: input.status ?? 'active',
            priority: input.priority ?? 0,
            isPrivate: input.isPrivate ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(
    async (planId: string, input: Partial<PlanInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.category !== undefined) updates.category = input.category ?? undefined;
      if (input.targetDate !== undefined) updates.targetDate = input.targetDate ?? undefined;
      if (input.budget !== undefined) updates.budget = input.budget ?? undefined;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.isPrivate !== undefined) updates.isPrivate = input.isPrivate;
      await db.transact(db.tx.plans[planId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (planId: string) => {
    await db.transact(db.tx.plans[planId].delete());
  }, []);

  return {
    plans,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
```

- [ ] **Step 2: Rewrite `src/hooks/useMilestones.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type MilestoneInput = {
  title: string;
  date: string;
  description?: string | null;
  icon?: string;
};

export function useMilestones() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { milestones: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const milestones = useMemo(() => data?.milestones ?? [], [data?.milestones]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = useMemo(
    () => milestones.filter((m) => m.date >= today),
    [milestones, today],
  );
  const past = useMemo(
    () => milestones.filter((m) => m.date < today),
    [milestones, today],
  );

  const create = useCallback(
    async (input: MilestoneInput) => {
      if (!coupleId || !user) return;
      const milestoneId = id();
      await db.transact(
        db.tx.milestones[milestoneId]
          .update({
            title: input.title,
            date: input.date,
            description: input.description ?? undefined,
            icon: input.icon ?? '🎉',
            createdAt: Date.now(),
          })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(
    async (milestoneId: string, input: Partial<MilestoneInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.date !== undefined) updates.date = input.date;
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.icon !== undefined) updates.icon = input.icon;
      await db.transact(db.tx.milestones[milestoneId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (milestoneId: string) => {
    await db.transact(db.tx.milestones[milestoneId].delete());
  }, []);

  return {
    milestones,
    upcoming,
    past,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
```

- [ ] **Step 3: Rewrite `src/hooks/useExpenses.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type ExpenseInput = {
  title: string;
  amount: number;
  paidBy?: string;
  currency?: string;
  splitType?: string;
  splitAmount?: number | null;
  category?: string;
  date?: string;
};

export function useExpenses() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { expenses: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const expenses = useMemo(() => data?.expenses ?? [], [data?.expenses]);
  const unsettled = useMemo(
    () => expenses.filter((e) => !e.isSettled),
    [expenses],
  );
  const settled = useMemo(
    () => expenses.filter((e) => e.isSettled),
    [expenses],
  );

  const create = useCallback(
    async (input: ExpenseInput) => {
      if (!coupleId || !userId) return;
      const expenseId = id();
      const paidById = input.paidBy ?? userId;
      await db.transact(
        db.tx.expenses[expenseId]
          .update({
            title: input.title,
            amount: input.amount,
            currency: input.currency ?? 'USD',
            splitType: input.splitType ?? 'even',
            splitAmount: input.splitAmount ?? undefined,
            category: input.category ?? 'general',
            date: input.date ?? new Date().toISOString().slice(0, 10),
            isSettled: false,
            createdAt: Date.now(),
          })
          .link({ couple: coupleId, paidBy: paidById }),
      );
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (expenseId: string, input: Partial<ExpenseInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.currency !== undefined) updates.currency = input.currency;
      if (input.splitType !== undefined) updates.splitType = input.splitType;
      if (input.splitAmount !== undefined) updates.splitAmount = input.splitAmount ?? undefined;
      if (input.category !== undefined) updates.category = input.category;
      if (input.date !== undefined) updates.date = input.date;
      const txns: any[] = [db.tx.expenses[expenseId].update(updates)];
      if (input.paidBy !== undefined) {
        txns.push(db.tx.expenses[expenseId].link({ paidBy: input.paidBy }));
      }
      await db.transact(txns);
    },
    [],
  );

  const settle = useCallback(async (expenseId: string) => {
    await db.transact(db.tx.expenses[expenseId].update({ isSettled: true }));
  }, []);

  const remove = useCallback(async (expenseId: string) => {
    await db.transact(db.tx.expenses[expenseId].delete());
  }, []);

  return {
    expenses,
    unsettled,
    settled,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    settle,
    refetch: async () => {},
  };
}
```

- [ ] **Step 4: Rewrite `src/hooks/useLoveNotes.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { useEncryption } from './useEncryption';

type LoveNoteInput = {
  body: string;
  isPrivate?: boolean;
};

export function useLoveNotes() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { loveNotes: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const rawNotes = useMemo(() => data?.loveNotes ?? [], [data?.loveNotes]);
  const [notes, setNotes] = useState<typeof rawNotes>([]);

  useEffect(() => {
    let cancelled = false;
    async function decryptNotes() {
      const decrypted = await Promise.all(
        rawNotes.map(async (note) => ({
          ...note,
          body: await decrypt(note.body),
        })),
      );
      if (!cancelled) setNotes(decrypted);
    }
    if (hasKey) {
      decryptNotes();
    } else {
      setNotes(rawNotes);
    }
    return () => {
      cancelled = true;
    };
  }, [rawNotes, decrypt, hasKey]);

  const create = useCallback(
    async (input: LoveNoteInput) => {
      if (!coupleId || !user) return;
      const noteId = id();
      const now = Date.now();
      await db.transact(
        db.tx.loveNotes[noteId]
          .update({
            body: await encrypt(input.body),
            isPrivate: input.isPrivate ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, author: user.id }),
      );
    },
    [coupleId, user, encrypt],
  );

  const update = useCallback(
    async (noteId: string, input: Partial<LoveNoteInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.body !== undefined) updates.body = await encrypt(input.body);
      if (input.isPrivate !== undefined) updates.isPrivate = input.isPrivate;
      await db.transact(db.tx.loveNotes[noteId].update(updates));
    },
    [encrypt],
  );

  const remove = useCallback(async (noteId: string) => {
    await db.transact(db.tx.loveNotes[noteId].delete());
  }, []);

  return {
    notes,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePlans.ts src/hooks/useMilestones.ts src/hooks/useExpenses.ts src/hooks/useLoveNotes.ts
git commit -m "feat: rewrite plans, milestones, expenses, love notes hooks for InstantDB"
```

---

## Task 6: Rewrite Simple CRUD Hooks (Batch 2 — CheckIns, Reminders, Wishlists)

**Files:**
- Modify: `src/hooks/useCheckIns.ts`
- Modify: `src/hooks/useReminders.ts`
- Modify: `src/hooks/useWishlists.ts`

- [ ] **Step 1: Rewrite `src/hooks/useCheckIns.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { useEncryption } from './useEncryption';
import { useSession } from './useSession';

export type CheckInRecord = {
  id: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
};

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function useCheckIns() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const today = getLocalDateKey();

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          checkIns: {
            $: { where: { 'couple.id': coupleId } },
            author: {},
          },
        }
      : null,
  );

  const rawCheckIns = useMemo<CheckInRecord[]>(() => {
    return (data?.checkIns ?? []).map((c) => ({
      id: c.id,
      authorId: c.author?.[0]?.id ?? '',
      mood: c.mood ?? null,
      note: c.note ?? null,
      isPrivate: c.isPrivate,
      checkInDate: c.checkInDate,
      createdAt: c.createdAt,
    }));
  }, [data?.checkIns]);

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function decryptRecords(items: CheckInRecord[]) {
      const decrypted = await Promise.all(
        items.map(async (item) => ({
          ...item,
          note: item.note ? await decrypt(item.note) : item.note,
        })),
      );
      if (!cancelled) setCheckIns(decrypted);
    }
    if (hasKey) {
      void decryptRecords(rawCheckIns);
    } else {
      setCheckIns(rawCheckIns);
    }
    return () => {
      cancelled = true;
    };
  }, [decrypt, hasKey, rawCheckIns]);

  const createOrUpdate = useCallback(
    async (input: {
      mood: string | null;
      note: string | null;
      isPrivate: boolean;
      checkInDate?: string;
    }) => {
      if (!coupleId || !userId || submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const dateKey = input.checkInDate ?? today;
        // Find existing check-in for this user+date to upsert
        const existing = checkIns.find(
          (c) => c.authorId === userId && c.checkInDate === dateKey,
        );
        const now = Date.now();
        if (existing) {
          await db.transact(
            db.tx.checkIns[existing.id].update({
              mood: input.mood ?? undefined,
              note: input.note ? await encrypt(input.note) : undefined,
              isPrivate: input.isPrivate,
              updatedAt: now,
            }),
          );
        } else {
          const checkInId = id();
          await db.transact(
            db.tx.checkIns[checkInId]
              .update({
                mood: input.mood ?? undefined,
                note: input.note ? await encrypt(input.note) : undefined,
                checkInDate: dateKey,
                isPrivate: input.isPrivate,
                createdAt: now,
                updatedAt: now,
              })
              .link({ couple: coupleId, author: userId }),
          );
        }
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [coupleId, userId, encrypt, today, checkIns],
  );

  const remove = useCallback(async (checkInId: string) => {
    await db.transact(db.tx.checkIns[checkInId].delete());
  }, []);

  const myTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today && record.authorId === userId,
      ) ?? null,
    [userId, checkIns, today],
  );
  const partnerTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today && record.authorId !== userId,
      ) ?? null,
    [userId, checkIns, today],
  );

  return {
    today,
    checkIns,
    todayCheckIns: checkIns.filter((record) => record.checkInDate === today),
    myTodayCheckIn,
    partnerTodayCheckIn,
    isLoading: !!coupleId && queryLoading,
    isSubmitting,
    createOrUpdate,
    remove,
    refetch: async () => {},
  };
}
```

- [ ] **Step 2: Rewrite `src/hooks/useReminders.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import type { Reminder } from '@/src/types/database';

type ReminderInput = {
  title: string;
  description?: string | null;
  due_at: string;
  recurrence?: string | null;
  priority?: number;
  category?: string | null;
  assigned_to?: string | null;
};

function toReminderRow(reminder: any): Reminder {
  return {
    id: reminder.id,
    couple_id: reminder.couple?.[0]?.id ?? '',
    created_by: reminder.createdBy?.[0]?.id ?? '',
    assigned_to: reminder.assignedTo?.[0]?.id ?? null,
    title: reminder.title,
    description: reminder.description ?? null,
    due_at: new Date(reminder.dueAt).toISOString(),
    recurrence: reminder.recurrence ?? null,
    is_completed: reminder.isCompleted,
    completed_at: reminder.completedAt == null ? null : new Date(reminder.completedAt).toISOString(),
    completed_by: reminder.completedBy?.[0]?.id ?? null,
    priority: reminder.priority,
    category: reminder.category ?? null,
    created_at: new Date(reminder.createdAt).toISOString(),
    updated_at: new Date(reminder.updatedAt).toISOString(),
  };
}

export function useReminders() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          reminders: {
            $: { where: { 'couple.id': coupleId }, order: { dueAt: 'asc' } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const reminders = useMemo(
    () => (data?.reminders ?? []).map(toReminderRow),
    [data?.reminders],
  );

  const create = useCallback(
    async (input: ReminderInput) => {
      if (!coupleId || !userId) return;
      const reminderId = id();
      const now = Date.now();
      const txn = db.tx.reminders[reminderId]
        .update({
          title: input.title,
          description: input.description ?? undefined,
          dueAt: new Date(input.due_at).getTime(),
          recurrence: input.recurrence ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          category: input.category ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, createdBy: userId });
      const txns: any[] = [txn];
      if (input.assigned_to) {
        txns.push(db.tx.reminders[reminderId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (reminderId: string, input: Partial<ReminderInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.due_at !== undefined) updates.dueAt = new Date(input.due_at).getTime();
      if (input.recurrence !== undefined) updates.recurrence = input.recurrence ?? undefined;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.category !== undefined) updates.category = input.category ?? undefined;
      const txns: any[] = [db.tx.reminders[reminderId].update(updates)];
      if (input.assigned_to !== undefined) {
        txns.push(db.tx.reminders[reminderId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [],
  );

  const remove = useCallback(async (reminderId: string) => {
    await db.transact(db.tx.reminders[reminderId].delete());
  }, []);

  const toggleComplete = useCallback(
    async (reminder: Reminder) => {
      const isNowCompleted = !reminder.is_completed;
      await db.transact(
        db.tx.reminders[reminder.id].update({
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? Date.now() : undefined,
          updatedAt: Date.now(),
        }),
      );
      if (isNowCompleted && userId) {
        await db.transact(db.tx.reminders[reminder.id].link({ completedBy: userId }));
      }
    },
    [userId],
  );

  const upcoming = reminders.filter((r) => !r.is_completed);
  const completed = reminders.filter((r) => r.is_completed);

  return {
    reminders,
    upcoming,
    completed,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    toggleComplete,
    refetch: async () => {},
  };
}
```

- [ ] **Step 3: Rewrite `src/hooks/useWishlists.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type WishlistItemInput = {
  title: string;
  description?: string | null;
  url?: string | null;
  price?: number | null;
  priority?: number;
};

export function useWishlists() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { wishlists: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const wishlists = useMemo(() => data?.wishlists ?? [], [data?.wishlists]);

  const create = useCallback(
    async (name: string) => {
      if (!coupleId || !user) return;
      const wishlistId = id();
      await db.transact(
        db.tx.wishlists[wishlistId]
          .update({ name, createdAt: Date.now() })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(async (wishlistId: string, name: string) => {
    await db.transact(db.tx.wishlists[wishlistId].update({ name }));
  }, []);

  const remove = useCallback(async (wishlistId: string) => {
    await db.transact(db.tx.wishlists[wishlistId].delete());
  }, []);

  return {
    wishlists,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}

export function useWishlistItems(wishlistId: string | null) {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId && wishlistId
      ? { wishlistItems: { $: { where: { 'wishlist.id': wishlistId } } } }
      : null,
  );

  const items = useMemo(() => data?.wishlistItems ?? [], [data?.wishlistItems]);

  const add = useCallback(
    async (input: WishlistItemInput) => {
      if (!wishlistId || !coupleId || !user) return;
      const itemId = id();
      await db.transact(
        db.tx.wishlistItems[itemId]
          .update({
            title: input.title,
            description: input.description ?? undefined,
            url: input.url ?? undefined,
            price: input.price ?? undefined,
            isPurchased: false,
            priority: input.priority ?? 0,
            sortOrder: items.length,
            createdAt: Date.now(),
          })
          .link({ wishlist: wishlistId, couple: coupleId, addedBy: user.id }),
      );
    },
    [wishlistId, coupleId, user, items.length],
  );

  const update = useCallback(
    async (itemId: string, input: Partial<WishlistItemInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.url !== undefined) updates.url = input.url ?? undefined;
      if (input.price !== undefined) updates.price = input.price ?? undefined;
      if (input.priority !== undefined) updates.priority = input.priority;
      await db.transact(db.tx.wishlistItems[itemId].update(updates));
    },
    [],
  );

  const togglePurchased = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const isNowPurchased = !item.isPurchased;
      const txns: any[] = [
        db.tx.wishlistItems[itemId].update({ isPurchased: isNowPurchased }),
      ];
      if (isNowPurchased && user) {
        txns.push(db.tx.wishlistItems[itemId].link({ purchasedBy: user.id }));
      }
      await db.transact(txns);
    },
    [items, user],
  );

  const remove = useCallback(async (itemId: string) => {
    await db.transact(db.tx.wishlistItems[itemId].delete());
  }, []);

  return {
    items,
    isLoading: !!coupleId && !!wishlistId && queryLoading,
    add,
    update,
    togglePurchased,
    remove,
    refetch: async () => {},
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCheckIns.ts src/hooks/useReminders.ts src/hooks/useWishlists.ts
git commit -m "feat: rewrite check-ins, reminders, wishlists hooks for InstantDB"
```

---

## Task 7: Rewrite Tasks and Journal Hooks

**Files:**
- Modify: `src/hooks/useTasks.ts`
- Modify: `src/hooks/useJournal.ts`

- [ ] **Step 1: Rewrite `src/hooks/useTasks.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import type { Database, Task } from '@/src/types/database';

type TaskUpdateInput = Database['public']['Tables']['tasks']['Update'];
type TaskCreateInput = {
  title: string;
  notes?: string | null;
  category?: string | null;
  due_date?: string | null;
  priority?: number;
  assigned_to?: string | null;
};

type TaskFeedFilter = 'all' | 'active' | 'done';

export type TaskFeedItem = Task;

export type TaskFeedViewState = {
  items: TaskFeedItem[];
  emptyState: {
    title: string;
    description: string;
    actionLabel: string;
  } | null;
};

function toIso(timestamp: number) {
  return new Date(timestamp).toISOString();
}

function toTaskRow(task: any): Task {
  return {
    id: task.id,
    couple_id: task.couple?.[0]?.id ?? '',
    title: task.title,
    notes: task.notes ?? null,
    category: task.category ?? null,
    is_completed: task.isCompleted,
    completed_at: task.completedAt == null ? null : toIso(task.completedAt),
    completed_by: task.completedBy?.[0]?.id ?? null,
    assigned_to: task.assignedTo?.[0]?.id ?? null,
    due_date: task.dueDate ?? null,
    priority: task.priority,
    sort_order: task.sortOrder,
    created_by: task.createdBy?.[0]?.id ?? '',
    created_at: toIso(task.createdAt),
    updated_at: toIso(task.updatedAt),
  };
}

function parseDueDate(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function compareTaskFeedItems(left: TaskFeedItem, right: TaskFeedItem) {
  if (left.is_completed !== right.is_completed) {
    return left.is_completed ? 1 : -1;
  }
  const leftDueDate = parseDueDate(left.due_date);
  const rightDueDate = parseDueDate(right.due_date);
  if (leftDueDate !== rightDueDate) {
    return leftDueDate - rightDueDate;
  }
  const priorityComparison = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityComparison !== 0) {
    return priorityComparison;
  }
  const titleComparison = left.title.localeCompare(right.title);
  if (titleComparison !== 0) {
    return titleComparison;
  }
  return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
}

function matchesTaskFeedFilter(task: Task, filter: TaskFeedFilter) {
  if (filter === 'active') return !task.is_completed;
  if (filter === 'done') return task.is_completed;
  return true;
}

export function buildTaskFeed(allTasks: Task[], filter: TaskFeedFilter = 'all'): TaskFeedItem[] {
  return allTasks
    .filter((task) => matchesTaskFeedFilter(task, filter))
    .sort(compareTaskFeedItems);
}

export function buildTaskFeedViewState(
  allTasks: Task[],
  filter: TaskFeedFilter = 'all',
): TaskFeedViewState {
  const items = buildTaskFeed(allTasks, filter);
  if (items.length > 0) {
    return { items, emptyState: null };
  }
  return {
    items,
    emptyState: {
      title: filter === 'done' ? 'No completed tasks' : filter === 'active' ? 'No active tasks' : 'No tasks yet',
      description:
        filter === 'done'
          ? 'Completed tasks will appear here once you finish them.'
          : filter === 'active'
            ? 'Active tasks will show up here as soon as they are added.'
            : 'Add your first task to get started.',
      actionLabel: 'Add Task',
    },
  };
}

export function useTasks() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          tasks: {
            $: { where: { 'couple.id': coupleId } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const allTasks = useMemo(
    () => (data?.tasks ?? []).map(toTaskRow),
    [data?.tasks],
  );
  const taskFeed = useMemo(() => buildTaskFeed(allTasks, 'all'), [allTasks]);

  const getTaskFeed = useCallback(
    (filter: TaskFeedFilter = 'all') => buildTaskFeed(allTasks, filter),
    [allTasks],
  );

  const createTask = useCallback(
    async (input: TaskCreateInput) => {
      if (!coupleId || !userId) return;
      const taskId = id();
      const now = Date.now();
      const txn = db.tx.tasks[taskId]
        .update({
          title: input.title,
          notes: input.notes ?? undefined,
          category: input.category ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          sortOrder: allTasks.length,
          dueDate: input.due_date ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, createdBy: userId });
      const txns: any[] = [txn];
      if (input.assigned_to) {
        txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [coupleId, userId, allTasks.length],
  );

  const updateTask = useCallback(
    async (taskId: string, input: TaskUpdateInput) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes ?? undefined;
      if (input.category !== undefined) updates.category = input.category ?? undefined;
      if (input.due_date !== undefined) updates.dueDate = input.due_date ?? undefined;
      if (input.priority !== undefined) updates.priority = input.priority;
      const txns: any[] = [db.tx.tasks[taskId].update(updates)];
      if (input.assigned_to !== undefined) {
        txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [],
  );

  const toggleTask = useCallback(
    async (task: Pick<Task, 'id' | 'is_completed'>) => {
      const isNowCompleted = !task.is_completed;
      const txns: any[] = [
        db.tx.tasks[task.id].update({
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? Date.now() : undefined,
          updatedAt: Date.now(),
        }),
      ];
      if (isNowCompleted && userId) {
        txns.push(db.tx.tasks[task.id].link({ completedBy: userId }));
      }
      await db.transact(txns);
    },
    [userId],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    await db.transact(db.tx.tasks[taskId].delete());
  }, []);

  return {
    allTasks,
    taskFeed,
    getTaskFeed,
    isLoading: !!coupleId && queryLoading,
    createTask,
    createTaskInDefaultList: createTask,
    updateTask,
    toggleTask,
    deleteTask,
    refetch: async () => {},
  };
}
```

- [ ] **Step 2: Rewrite `src/hooks/useJournal.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { useEncryption } from './useEncryption';
import type { JournalEntry } from '@/src/types/database';

type EntryInput = {
  title?: string | null;
  body: string;
  mood?: string | null;
  is_private?: boolean;
  entry_date: string;
};

type JournalImageUploadInput = {
  uri: string;
  contentType?: string;
};

export type JournalFilter = 'all' | 'shared' | 'private';

function toJournalEntryRow(entry: any): JournalEntry {
  return {
    id: entry.id,
    couple_id: entry.couple?.[0]?.id ?? '',
    author_id: entry.author?.[0]?.id ?? '',
    title: entry.title ?? null,
    body: entry.body,
    mood: entry.mood ?? null,
    is_private: entry.isPrivate,
    media_urls: (entry.media ?? []).map((f: any) => f.url).filter(Boolean),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    entry_date: entry.entryDate,
    created_at: new Date(entry.createdAt).toISOString(),
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
}

export function useJournal() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const [filter, setFilter] = useState<JournalFilter>('all');

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          journalEntries: {
            $: { where: { 'couple.id': coupleId } },
            couple: {},
            author: {},
            media: {},
          },
        }
      : null,
  );

  const rawEntries = useMemo(
    () => (data?.journalEntries ?? []).map(toJournalEntryRow),
    [data?.journalEntries],
  );
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function decryptEntries() {
      const decrypted = await Promise.all(
        rawEntries.map(async (entry) => ({
          ...entry,
          title: entry.title ? await decrypt(entry.title) : entry.title,
          body: await decrypt(entry.body),
        })),
      );
      if (!cancelled) setAllEntries(decrypted);
    }
    if (hasKey) {
      decryptEntries();
    } else {
      setAllEntries(rawEntries);
    }
    return () => {
      cancelled = true;
    };
  }, [rawEntries, decrypt, hasKey]);

  const create = useCallback(
    async (input: EntryInput & { mediaFileIds?: string[] }) => {
      if (!coupleId || !userId) return;
      const entryId = id();
      const now = Date.now();
      const txn = db.tx.journalEntries[entryId]
        .update({
          title: input.title ? await encrypt(input.title) : undefined,
          body: await encrypt(input.body),
          mood: input.mood ?? undefined,
          isPrivate: input.is_private ?? false,
          tags: [],
          entryDate: input.entry_date,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, author: userId });
      const txns: any[] = [txn];
      if (input.mediaFileIds?.length) {
        txns.push(
          db.tx.journalEntries[entryId].link({ media: input.mediaFileIds }),
        );
      }
      await db.transact(txns);
    },
    [coupleId, userId, encrypt],
  );

  const update = useCallback(
    async (entryId: string, input: Partial<EntryInput> & { mediaFileIds?: string[] }) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title ? await encrypt(input.title) : undefined;
      if (input.body !== undefined) updates.body = await encrypt(input.body!);
      if (input.mood !== undefined) updates.mood = input.mood ?? undefined;
      if (input.is_private !== undefined) updates.isPrivate = input.is_private;
      if (input.entry_date !== undefined) updates.entryDate = input.entry_date;
      const txns: any[] = [db.tx.journalEntries[entryId].update(updates)];
      if (input.mediaFileIds?.length) {
        txns.push(
          db.tx.journalEntries[entryId].link({ media: input.mediaFileIds }),
        );
      }
      await db.transact(txns);
    },
    [encrypt],
  );

  const remove = useCallback(async (entryId: string) => {
    // Delete linked media files first
    const entry = allEntries.find((e) => e.id === entryId);
    const mediaToDelete = data?.journalEntries
      ?.find((e: any) => e.id === entryId)
      ?.media ?? [];
    const txns: any[] = mediaToDelete.map((file: any) =>
      db.tx.$files[file.id].delete(),
    );
    txns.push(db.tx.journalEntries[entryId].delete());
    await db.transact(txns);
  }, [allEntries, data?.journalEntries]);

  const entries = allEntries.filter((entry) => {
    if (filter === 'shared') return !entry.is_private;
    if (filter === 'private') return entry.author_id === userId && entry.is_private;
    return true;
  });

  const uploadJournalImage = useCallback(
    async ({ uri, contentType }: JournalImageUploadInput) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `journal/${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const file = new File([blob], filename, { type: contentType ?? 'image/jpeg' });
      const { data: fileData } = await db.storage.uploadFile(filename, file);
      return fileData.id;
    },
    [],
  );

  return {
    entries,
    allEntries,
    isLoading: !!coupleId && queryLoading,
    filter,
    setFilter,
    create,
    update,
    remove,
    uploadJournalImage,
    refetch: async () => {},
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useJournal.ts
git commit -m "feat: rewrite tasks and journal hooks for InstantDB"
```

---

## Task 8: Extract Timeline Builders and Create Shared Types

**Files:**
- Create: `src/lib/home/types.ts`
- Create: `src/lib/home/builders.ts`

- [ ] **Step 1: Create `src/lib/home/types.ts`**

```typescript
import type { DailyVerse } from './dailyVerse';

export type TimelineItem = {
  id: string;
  type: 'event' | 'plan' | 'reminder' | 'task' | 'ritual' | 'memory';
  sourceId: string;
  sourceTable: string;
  title: string;
  subtitle: string | null;
  occursAt: number | null;
  priority: number;
  isPrivate: boolean;
  isOverdue: boolean;
};

export type FeaturedSignal = {
  kind: 'checkIn' | 'loveNote' | 'memory' | 'countdown' | 'presence';
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  occursAt: number | null;
};

export type MilestoneStripItem = {
  id: string;
  type: 'countdown' | 'milestone';
  title: string;
  subtitle: string | null;
  date: string;
  daysUntil: number;
};

export type MemoryPreview = {
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  createdAt: number;
  mediaUrls: string[];
};

export type PresenceInfo = {
  coupleId: string;
  coupleName: string;
  memberCount: number;
  relationshipState: 'paired' | 'waiting';
  self: { userId: string; displayName: string; avatarUrl: string | null };
  partner: { userId: string; displayName: string; avatarUrl: string | null } | null;
  joinedAt: number;
};

export type HomeView = {
  hero: FeaturedSignal | null;
  timeline: TimelineItem[];
  milestones: MilestoneStripItem[];
  memories: MemoryPreview[];
  memoryPreview: MemoryPreview | null;
  presence: PresenceInfo | null;
  dailyVerse: DailyVerse;
};

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  itemCount: number;
  kinds: Array<TimelineItem['type'] | 'milestone'>;
};

export type CalendarView = {
  month: string;
  monthLabel: string;
  selectedDate: string | null;
  days: CalendarDay[];
  agenda: TimelineItem[];
  milestones: MilestoneStripItem[];
};
```

- [ ] **Step 2: Create `src/lib/home/builders.ts`**

This file extracts the pure functions from `convex/timeline.ts`. The functions take raw data arrays and return structured output. They have no database or framework dependencies.

```typescript
import type {
  TimelineItem,
  FeaturedSignal,
  MilestoneStripItem,
  MemoryPreview,
  PresenceInfo,
  CalendarDay,
} from './types';

function startOfUtcDay(timestamp: number) {
  const day = new Date(timestamp);
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

function endOfUtcDay(timestamp: number) {
  return startOfUtcDay(timestamp) + 24 * 60 * 60 * 1000 - 1;
}

function toDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateOnly(date: string | null) {
  if (!date) return null;
  return Date.parse(`${date}T12:00:00.000Z`);
}

function daysBetween(now: number, date: string) {
  return Math.round((parseDateOnly(date)! - startOfUtcDay(now)) / (24 * 60 * 60 * 1000));
}

function withinPreviewWindow(
  now: number,
  previewDays: number,
  occursAt: number | null,
  dateOnly: string | null,
) {
  if (occursAt !== null) {
    return occursAt <= endOfUtcDay(now + previewDays * 24 * 60 * 60 * 1000);
  }
  if (!dateOnly) return false;
  return daysBetween(now, dateOnly) <= previewDays;
}

function timelineSort(left: TimelineItem, right: TimelineItem) {
  const leftBucket = left.isOverdue ? 0 : 1;
  const rightBucket = right.isOverdue ? 0 : 1;
  const leftOccurs = left.occursAt ?? Number.MAX_SAFE_INTEGER;
  const rightOccurs = right.occursAt ?? Number.MAX_SAFE_INTEGER;
  return (
    leftBucket - rightBucket ||
    leftOccurs - rightOccurs ||
    right.priority - left.priority ||
    left.title.localeCompare(right.title) ||
    left.sourceId.localeCompare(right.sourceId)
  );
}

export function buildTimelineItems({
  now,
  previewDays,
  events,
  plans,
  reminders,
  tasks,
  rituals,
  memories,
}: {
  now: number;
  previewDays: number;
  events: any[];
  plans: any[];
  reminders: any[];
  tasks: any[];
  rituals: any[];
  memories: MemoryPreview[];
}) {
  const today = toDateString(now);
  const items: TimelineItem[] = [];

  for (const event of events) {
    if (event.isPrivate) continue;
    if (!withinPreviewWindow(now, previewDays, event.startsAt, null)) continue;
    items.push({
      id: `event:${event.id}`,
      type: 'event',
      sourceId: event.id,
      sourceTable: 'events',
      title: event.title,
      subtitle: event.description ?? null,
      occursAt: event.startsAt,
      priority: event.priority,
      isPrivate: event.isPrivate,
      isOverdue: event.startsAt < now,
    });
  }

  for (const plan of plans) {
    if (plan.isPrivate) continue;
    if (['done', 'completed', 'cancelled'].includes((plan.status ?? '').toLowerCase())) continue;
    if (!withinPreviewWindow(now, previewDays, null, plan.targetDate ?? null)) continue;
    items.push({
      id: `plan:${plan.id}`,
      type: 'plan',
      sourceId: plan.id,
      sourceTable: 'plans',
      title: plan.title,
      subtitle: plan.description ?? plan.notes ?? null,
      occursAt: parseDateOnly(plan.targetDate ?? null),
      priority: plan.priority,
      isPrivate: plan.isPrivate,
      isOverdue: !!plan.targetDate && plan.targetDate < today,
    });
  }

  for (const reminder of reminders) {
    if (reminder.isCompleted) continue;
    const dueAt = reminder.dueAt;
    if (dueAt == null) continue;
    if (!withinPreviewWindow(now, previewDays, dueAt, null)) continue;
    items.push({
      id: `reminder:${reminder.id}`,
      type: 'reminder',
      sourceId: reminder.id,
      sourceTable: 'reminders',
      title: reminder.title ?? 'Reminder',
      subtitle: reminder.description ?? null,
      occursAt: dueAt,
      priority: reminder.priority ?? 0,
      isPrivate: false,
      isOverdue: dueAt < now,
    });
  }

  for (const task of tasks) {
    if (task.isCompleted) continue;
    const dueDate = task.dueDate ?? null;
    if (!dueDate || !withinPreviewWindow(now, previewDays, null, dueDate)) continue;
    items.push({
      id: `task:${task.id}`,
      type: 'task',
      sourceId: task.id,
      sourceTable: 'tasks',
      title: task.title ?? 'Task',
      subtitle: task.notes ?? null,
      occursAt: parseDateOnly(dueDate),
      priority: task.priority ?? 0,
      isPrivate: false,
      isOverdue: dueDate < today,
    });
  }

  for (const ritual of rituals) {
    if (ritual.isPrivate || !ritual.isActive) continue;
    const occursAt = ritual.nextOccurrenceAt ?? parseDateOnly(ritual.dueDate ?? null);
    if (!withinPreviewWindow(now, previewDays, occursAt, ritual.dueDate ?? null)) continue;
    items.push({
      id: `ritual:${ritual.id}`,
      type: 'ritual',
      sourceId: ritual.id,
      sourceTable: 'rituals',
      title: ritual.title,
      subtitle: ritual.description ?? ritual.cadence ?? null,
      occursAt,
      priority: ritual.priority,
      isPrivate: ritual.isPrivate,
      isOverdue: occursAt !== null ? occursAt < now : !!ritual.dueDate && ritual.dueDate < today,
    });
  }

  for (const memory of memories.slice(0, 1)) {
    items.push({
      id: `memory:${memory.sourceId}`,
      type: 'memory',
      sourceId: memory.sourceId,
      sourceTable: memory.sourceTable,
      title: memory.title,
      subtitle: memory.body,
      occursAt: memory.createdAt,
      priority: -1,
      isPrivate: false,
      isOverdue: false,
    });
  }

  return items.sort(timelineSort);
}

export function buildMemoryPreviews({
  journalEntries,
  loveNotes,
}: {
  journalEntries: any[];
  loveNotes: any[];
}): MemoryPreview[] {
  const previews: MemoryPreview[] = [];

  for (const entry of journalEntries) {
    if (entry.isPrivate) continue;
    previews.push({
      sourceId: entry.id,
      sourceTable: 'journalEntries',
      title: entry.title ?? 'Shared memory',
      body: entry.body ?? '',
      createdAt: entry.createdAt ?? 0,
      mediaUrls: (entry.media ?? []).map((f: any) => f.url).filter(Boolean),
    });
  }

  for (const note of loveNotes) {
    if (note.isPrivate) continue;
    previews.push({
      sourceId: note.id,
      sourceTable: 'loveNotes',
      title: 'Love note',
      body: note.body ?? '',
      createdAt: note.createdAt ?? 0,
      mediaUrls: [],
    });
  }

  previews.sort(
    (left, right) =>
      right.createdAt - left.createdAt || left.sourceId.localeCompare(right.sourceId),
  );

  return previews;
}

export function buildMilestones({
  now,
  couple,
  milestones,
}: {
  now: number;
  couple: { id: string; anniversary: string | null };
  milestones: any[];
}): MilestoneStripItem[] {
  const items: MilestoneStripItem[] = [];

  if (couple.anniversary) {
    const daysUntil = daysBetween(now, couple.anniversary);
    if (daysUntil >= 0 && daysUntil <= 30) {
      items.push({
        id: `countdown:${couple.id}`,
        type: 'countdown',
        title: 'Anniversary',
        subtitle: `${daysUntil} day${daysUntil === 1 ? '' : 's'} to go`,
        date: couple.anniversary,
        daysUntil,
      });
    }
  }

  for (const milestone of milestones) {
    const date = milestone.date;
    if (!date) continue;
    const daysUntil = daysBetween(now, date);
    if (daysUntil < 0 || daysUntil > 30) continue;
    items.push({
      id: `milestone:${milestone.id}`,
      type: 'milestone',
      title: milestone.title ?? 'Milestone',
      subtitle: milestone.description ?? null,
      date,
      daysUntil,
    });
  }

  return items.sort(
    (left, right) =>
      left.daysUntil - right.daysUntil || left.title.localeCompare(right.title),
  );
}

export function selectFeaturedSignal({
  now,
  presence,
  milestones,
  memoryPreview,
  checkIns,
}: {
  now: number;
  presence: PresenceInfo | null;
  milestones: MilestoneStripItem[];
  memoryPreview: MemoryPreview | null;
  checkIns: any[];
}): FeaturedSignal | null {
  const sharedCheckIns = checkIns
    .filter((c) => !c.isPrivate && !!c.note)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  if (sharedCheckIns[0]) {
    const featured = sharedCheckIns[0];
    return {
      kind: 'checkIn',
      sourceId: featured.id,
      sourceTable: 'checkIns',
      title: 'Relationship pulse',
      body: featured.note ?? 'A check-in was shared.',
      occursAt: featured.createdAt,
    };
  }

  if (memoryPreview?.sourceTable === 'loveNotes') {
    return {
      kind: 'loveNote',
      sourceId: memoryPreview.sourceId,
      sourceTable: memoryPreview.sourceTable,
      title: memoryPreview.title,
      body: memoryPreview.body,
      occursAt: memoryPreview.createdAt,
    };
  }

  if (memoryPreview) {
    return {
      kind: 'memory',
      sourceId: memoryPreview.sourceId,
      sourceTable: memoryPreview.sourceTable,
      title: memoryPreview.title,
      body: memoryPreview.body,
      occursAt: memoryPreview.createdAt,
    };
  }

  if (milestones[0]) {
    const countdown = milestones[0];
    return {
      kind: 'countdown',
      sourceId: countdown.id,
      sourceTable: 'milestones',
      title: countdown.title,
      body: `${countdown.daysUntil} day${countdown.daysUntil === 1 ? '' : 's'} until ${countdown.title.toLowerCase()}.`,
      occursAt: parseDateOnly(countdown.date),
    };
  }

  return presence
    ? {
        kind: 'presence',
        sourceId: presence.coupleId,
        sourceTable: 'couples',
        title: presence.partner ? 'You two are in sync' : 'Invite your partner in',
        body: presence.partner
          ? `${presence.self.displayName} and ${presence.partner.displayName} are connected today.`
          : 'Your shared space is ready when your partner joins.',
        occursAt: now,
      }
    : null;
}

function addDays(date: Date, days: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

export function buildCalendarDays({
  now,
  month,
  items,
  milestones,
}: {
  now: number;
  month: string;
  items: TimelineItem[];
  milestones: MilestoneStripItem[];
}): CalendarDay[] {
  const [year, monthIndex] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
  const firstGridDay = addDays(monthStart, -monthStart.getUTCDay());
  const today = toDateString(now);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(firstGridDay, index);
    const date = current.toISOString().slice(0, 10);
    const dayItems = items.filter((item) => {
      if (item.occursAt === null) return false;
      return toDateString(item.occursAt) === date;
    });
    const dayMilestones = milestones.filter((m) => m.date === date);
    const kinds = Array.from(
      new Set([
        ...dayItems.map((item) => item.type),
        ...dayMilestones.map(() => 'milestone' as const),
      ]),
    );

    return {
      date,
      inMonth: current.getUTCMonth() === monthStart.getUTCMonth(),
      isToday: date === today,
      itemCount: dayItems.length + dayMilestones.length,
      kinds,
    };
  });
}

export function formatMonthLabel(month: string) {
  const monthStart = new Date(Date.parse(`${month}-01T00:00:00.000Z`));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/home/types.ts src/lib/home/builders.ts
git commit -m "feat: extract timeline/calendar builder functions and shared types"
```

---

## Task 9: Create Expo API Routes

**Files:**
- Create: `app/api/home+api.ts`
- Create: `app/api/calendar+api.ts`
- Create: `app/api/daily-verse+api.ts`

- [ ] **Step 1: Create `app/api/home+api.ts`**

```typescript
import { init } from '@instantdb/admin';
import schema from '../../instant.schema';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  selectFeaturedSignal,
} from '@/src/lib/home/builders';
import type { HomeView, PresenceInfo } from '@/src/lib/home/types';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

function emptyHomeView(): HomeView {
  const dateKey = new Date().toISOString().slice(0, 10);
  return {
    hero: null,
    timeline: [],
    milestones: [],
    memories: [],
    memoryPreview: null,
    presence: null,
    dailyVerse: getCuratedDailyVerse(dateKey),
  };
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json(emptyHomeView());

  let user;
  try {
    user = await db.auth.verifyToken(token);
  } catch {
    return Response.json(emptyHomeView());
  }
  if (!user) return Response.json(emptyHomeView());

  const { memberships } = await db.query({
    memberships: {
      $: { where: { 'user.id': user.id, status: 'active' } },
      couple: {},
      user: {},
    },
  });

  const activeMembership = memberships[0];
  const couple = activeMembership?.couple?.[0];
  if (!couple) return Response.json(emptyHomeView());

  const coupleId = couple.id;
  const url = new URL(request.url);
  const previewDays = Number(url.searchParams.get('previewDays') ?? '7');
  const now = Date.now();

  const data = await db.query({
    events: { $: { where: { 'couple.id': coupleId } } },
    plans: { $: { where: { 'couple.id': coupleId } } },
    rituals: { $: { where: { 'couple.id': coupleId } } },
    checkIns: { $: { where: { 'couple.id': coupleId } } },
    reminders: { $: { where: { 'couple.id': coupleId } } },
    tasks: { $: { where: { 'couple.id': coupleId } } },
    milestones: { $: { where: { 'couple.id': coupleId } } },
    journalEntries: { $: { where: { 'couple.id': coupleId } }, media: {} },
    loveNotes: { $: { where: { 'couple.id': coupleId } } },
  });

  // Resolve partner
  const { memberships: allMembers } = await db.query({
    memberships: {
      $: { where: { 'couple.id': coupleId, status: 'active' } },
      user: {},
    },
  });

  const partnerMembership = allMembers.find(
    (m) => m.user?.[0]?.id !== user!.id,
  );
  const partnerUser = partnerMembership?.user?.[0];

  const presence: PresenceInfo = {
    coupleId,
    coupleName: couple.name,
    memberCount: allMembers.length,
    relationshipState: partnerUser ? 'paired' : 'waiting',
    self: {
      userId: user.id,
      displayName: (user as any).displayName ?? user.email ?? '',
      avatarUrl: (user as any).avatarUrl ?? null,
    },
    partner: partnerUser
      ? {
          userId: partnerUser.id,
          displayName: (partnerUser as any).displayName ?? (partnerUser as any).email ?? 'Partner',
          avatarUrl: (partnerUser as any).avatarUrl ?? null,
        }
      : null,
    joinedAt: activeMembership.joinedAt,
  };

  const memories = buildMemoryPreviews({
    journalEntries: data.journalEntries,
    loveNotes: data.loveNotes,
  });
  const memoryPreview = memories[0] ?? null;
  const milestoneStrip = buildMilestones({
    now,
    couple: { id: coupleId, anniversary: couple.anniversary ?? null },
    milestones: data.milestones,
  });
  const timeline = buildTimelineItems({
    now,
    previewDays,
    events: data.events,
    plans: data.plans,
    reminders: data.reminders,
    tasks: data.tasks,
    rituals: data.rituals,
    memories: memoryPreview ? [memoryPreview] : [],
  });

  // Daily verse
  const dateKey = new Date(now).toISOString().slice(0, 10);
  const { dailyVerseCache } = await db.query({
    dailyVerseCache: { $: { where: { dateKey } } },
  });
  const dailyVerse = dailyVerseCache[0]
    ? {
        text: dailyVerseCache[0].text,
        reference: dailyVerseCache[0].reference,
        translation: dailyVerseCache[0].translation,
        source: dailyVerseCache[0].source as 'remote' | 'fallback',
        dateKey,
      }
    : getCuratedDailyVerse(dateKey);

  const hero = selectFeaturedSignal({
    now,
    presence,
    milestones: milestoneStrip,
    memoryPreview,
    checkIns: data.checkIns,
  });

  const view: HomeView = {
    hero,
    timeline,
    milestones: milestoneStrip,
    memories,
    memoryPreview,
    presence,
    dailyVerse,
  };

  return Response.json(view);
}
```

- [ ] **Step 2: Create `app/api/calendar+api.ts`**

```typescript
import { init } from '@instantdb/admin';
import schema from '../../instant.schema';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  buildCalendarDays,
  formatMonthLabel,
} from '@/src/lib/home/builders';
import type { CalendarView } from '@/src/lib/home/types';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

function toDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function emptyCalendarView(month: string, selectedDate: string | null): CalendarView {
  return {
    month,
    monthLabel: formatMonthLabel(month),
    selectedDate,
    days: [],
    agenda: [],
    milestones: [],
  };
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const url = new URL(request.url);
  const now = Date.now();
  const selectedDate = url.searchParams.get('selectedDate') ?? null;
  const month = url.searchParams.get('month') ?? (selectedDate ? selectedDate.slice(0, 7) : toDateString(now).slice(0, 7));

  if (!token) return Response.json(emptyCalendarView(month, selectedDate));

  let user;
  try {
    user = await db.auth.verifyToken(token);
  } catch {
    return Response.json(emptyCalendarView(month, selectedDate));
  }
  if (!user) return Response.json(emptyCalendarView(month, selectedDate));

  const { memberships } = await db.query({
    memberships: {
      $: { where: { 'user.id': user.id, status: 'active' } },
      couple: {},
    },
  });
  const couple = memberships[0]?.couple?.[0];
  if (!couple) return Response.json(emptyCalendarView(month, selectedDate));

  const coupleId = couple.id;
  const previewDays = Math.max(30, 60);

  const data = await db.query({
    events: { $: { where: { 'couple.id': coupleId } } },
    plans: { $: { where: { 'couple.id': coupleId } } },
    rituals: { $: { where: { 'couple.id': coupleId } } },
    reminders: { $: { where: { 'couple.id': coupleId } } },
    tasks: { $: { where: { 'couple.id': coupleId } } },
    milestones: { $: { where: { 'couple.id': coupleId } } },
    journalEntries: { $: { where: { 'couple.id': coupleId } }, media: {} },
    loveNotes: { $: { where: { 'couple.id': coupleId } } },
  });

  const memories = buildMemoryPreviews({
    journalEntries: data.journalEntries,
    loveNotes: data.loveNotes,
  });
  const memoryPreview = memories[0] ?? null;
  const milestoneStrip = buildMilestones({
    now,
    couple: { id: coupleId, anniversary: couple.anniversary ?? null },
    milestones: data.milestones,
  });
  const timeline = buildTimelineItems({
    now,
    previewDays,
    events: data.events,
    plans: data.plans,
    reminders: data.reminders,
    tasks: data.tasks,
    rituals: data.rituals,
    memories: memoryPreview ? [memoryPreview] : [],
  });

  const days = buildCalendarDays({ now, month, items: timeline, milestones: milestoneStrip });
  const agenda = timeline.filter((item) => {
    if (item.occursAt === null) return false;
    const itemDate = toDateString(item.occursAt);
    if (selectedDate) return itemDate === selectedDate;
    return itemDate.startsWith(month);
  });
  const monthMilestones = milestoneStrip.filter((m) => m.date.startsWith(month));

  const view: CalendarView = {
    month,
    monthLabel: formatMonthLabel(month),
    selectedDate,
    days,
    agenda,
    milestones: monthMilestones,
  };

  return Response.json(view);
}
```

- [ ] **Step 3: Create `app/api/daily-verse+api.ts`**

```typescript
import { init, id } from '@instantdb/admin';
import schema from '../../instant.schema';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import type { DailyVerse } from '@/src/lib/home/dailyVerse';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

export async function POST(request: Request) {
  const now = Date.now();
  const dateKey = new Date(now).toISOString().slice(0, 10);

  // Check cache first
  const { dailyVerseCache } = await db.query({
    dailyVerseCache: { $: { where: { dateKey } } },
  });

  if (dailyVerseCache[0]) {
    return Response.json({
      text: dailyVerseCache[0].text,
      reference: dailyVerseCache[0].reference,
      translation: dailyVerseCache[0].translation,
      source: dailyVerseCache[0].source,
      dateKey,
    });
  }

  // Fetch from remote API
  let verse: DailyVerse;
  try {
    const response = await fetch(
      'https://labs.bible.org/api/?passage=votd&type=json',
    );
    if (!response.ok) throw new Error('API fetch failed');
    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : data;
    verse = {
      text: entry.text?.replace(/<[^>]*>/g, '') ?? '',
      reference: `${entry.bookname ?? ''} ${entry.chapter ?? ''}:${entry.verse ?? ''}`.trim(),
      translation: 'NET',
      source: 'remote',
      dateKey,
    };
  } catch {
    verse = getCuratedDailyVerse(dateKey);
  }

  // Cache the verse via admin SDK
  const cacheId = id();
  await db.transact(
    db.tx.dailyVerseCache[cacheId].update({
      dateKey: verse.dateKey,
      text: verse.text,
      reference: verse.reference,
      translation: verse.translation,
      source: verse.source,
      fetchedAt: now,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return Response.json(verse);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/home+api.ts app/api/calendar+api.ts app/api/daily-verse+api.ts
git commit -m "feat: add Expo API routes for home timeline, calendar, and daily verse"
```

---

## Task 10: Rewrite Home Timeline and Calendar Hooks

**Files:**
- Modify: `src/hooks/useHomeTimeline.ts`
- Modify: `src/hooks/useCalendar.ts`

- [ ] **Step 1: Rewrite `src/hooks/useHomeTimeline.ts`**

Replace the entire file contents with:

```typescript
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { db } from '@/src/lib/instant';
import type { HomeView } from '@/src/lib/home/types';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';

export type HomeQuickAction = {
  id: string;
  label: string;
  route: string;
  icon: ComponentProps<typeof Feather>['name'];
  tint: string;
  background: string;
};

async function fetchHomeView(token: string | null, previewDays: number): Promise<HomeView | null> {
  if (!token) return null;
  try {
    const res = await fetch(`/api/home?previewDays=${previewDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useHomeTimeline(options?: { previewDays?: number }) {
  const colors = useColors();
  const { activeCouple } = useSession();
  const [view, setView] = useState<HomeView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const warmedDateRef = useRef<string | null>(null);
  const previewDays = options?.previewDays ?? 7;
  const todayKey = new Date().toISOString().slice(0, 10);

  const loadView = useCallback(async () => {
    const user = await db.getAuth();
    const token = (user as any)?._token ?? null;
    setIsLoading(true);
    const result = await fetchHomeView(token, previewDays);
    setView(result);
    setIsLoading(false);
  }, [previewDays]);

  useEffect(() => {
    if (!activeCouple) {
      setView(null);
      setIsLoading(false);
      return;
    }
    loadView();
  }, [activeCouple, loadView]);

  // Ensure daily verse once per day
  useEffect(() => {
    if (warmedDateRef.current === todayKey || !activeCouple) return;
    warmedDateRef.current = todayKey;
    db.getAuth().then((user) => {
      const token = (user as any)?._token ?? null;
      if (!token) return;
      fetch('/api/daily-verse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => loadView())
        .catch(() => undefined);
    });
  }, [todayKey, activeCouple, loadView]);

  const quickActions = useMemo<HomeQuickAction[]>(
    () => [
      {
        id: 'calendar',
        label: 'Calendar',
        route: '/(tabs)/calendar',
        icon: 'calendar',
        tint: colors.info,
        background: colors.infoLight,
      },
      {
        id: 'reminders',
        label: 'Reminders',
        route: '/(tabs)/reminders',
        icon: 'bell',
        tint: colors.reminders,
        background: colors.remindersLight,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        route: '/(tabs)/tasks',
        icon: 'check-square',
        tint: colors.tasks,
        background: colors.tasksLight,
      },
      {
        id: 'journal',
        label: 'Journal',
        route: '/(tabs)/journal',
        icon: 'book-open',
        tint: colors.journal,
        background: colors.journalLight,
      },
    ],
    [colors],
  );

  return {
    isLoading,
    hero: view?.hero ?? null,
    timeline: view?.timeline ?? [],
    milestones: view?.milestones ?? [],
    memories: view?.memories ?? [],
    memoryPreview: view?.memoryPreview ?? null,
    presence: view?.presence ?? null,
    dailyVerse: view?.dailyVerse ?? getCuratedDailyVerse(todayKey),
    quickActions,
    refetch: loadView,
  };
}
```

- [ ] **Step 2: Rewrite `src/hooks/useCalendar.ts`**

Replace the entire file contents with:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addMonths, format, parseISO } from 'date-fns';
import { db } from '@/src/lib/instant';
import type { CalendarView } from '@/src/lib/home/types';
import { formatMonthLabel } from '@/src/lib/home/builders';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchCalendarView(
  token: string | null,
  month: string,
  selectedDate: string | null,
): Promise<CalendarView | null> {
  if (!token) return null;
  try {
    const params = new URLSearchParams({ month });
    if (selectedDate) params.set('selectedDate', selectedDate);
    const res = await fetch(`/api/calendar?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useCalendar() {
  const initialDate = todayString();
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [view, setView] = useState<CalendarView | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const monthDate = useMemo(() => parseISO(`${month}-01`), [month]);

  const loadView = useCallback(async () => {
    const user = await db.getAuth();
    const token = (user as any)?._token ?? null;
    setIsLoading(true);
    const result = await fetchCalendarView(token, month, selectedDate);
    setView(result);
    setIsLoading(false);
  }, [month, selectedDate]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const selectDate = (nextDate: string | null) => {
    if (!nextDate) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(nextDate);
    setMonth(nextDate.slice(0, 7));
  };

  const setMonthAndSelection = (nextMonth: string) => {
    setMonth(nextMonth);
    setSelectedDate((current) =>
      current && current.startsWith(nextMonth) ? current : `${nextMonth}-01`,
    );
  };

  return {
    isLoading,
    month: view?.month ?? month,
    monthLabel: view?.monthLabel ?? format(monthDate, 'MMMM yyyy'),
    selectedDate: view?.selectedDate ?? selectedDate,
    days: view?.days ?? [],
    agenda: view?.agenda ?? [],
    milestones: view?.milestones ?? [],
    selectDate,
    goToPreviousMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, -1), 'yyyy-MM'));
    },
    goToNextMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, 1), 'yyyy-MM'));
    },
    goToToday: () => {
      const today = todayString();
      setSelectedDate(today);
      setMonth(today.slice(0, 7));
    },
    refetch: loadView,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHomeTimeline.ts src/hooks/useCalendar.ts
git commit -m "feat: rewrite home timeline and calendar hooks to use Expo API routes"
```

---

## Task 11: Fix Remaining Import References

After deleting `convex/` and rewriting hooks, there may be remaining imports referencing Convex or deleted files. This task fixes them.

**Files:**
- Scan and fix: any file importing from `convex/`, `@convex-dev/`, `better-auth`, or `src/lib/convex`, `src/lib/auth-client`

- [ ] **Step 1: Find all remaining Convex imports**

```bash
grep -r "from.*convex" src/ app/ --include="*.ts" --include="*.tsx" -l
grep -r "from.*better-auth" src/ app/ --include="*.ts" --include="*.tsx" -l
grep -r "from.*auth-client" src/ app/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: Fix each file found**

For each file that still imports from Convex or Better Auth:
- If it imports `useQuery`/`useMutation` from `convex/react` — it should have been rewritten in earlier tasks. If missed, rewrite it following the same pattern.
- If it imports types from `@/convex/timeline` — change to import from `@/src/lib/home/types`.
- If it imports from `@/convex/lib/auth` — remove the import and use the new `useSession` types.
- If it imports `authClient` from `@/src/lib/auth-client` — remove and use `db.auth` from `@/src/lib/instant`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors found. Common issues:
- Missing `_id` references (InstantDB uses `id` not `_id`)
- `activeCouple?.membership?.userId` → `activeCouple?.membership?.userId` (same in new session)
- `activeCouple?.couple?._id` → `activeCouple?.couple?.id`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve remaining Convex import references and type errors"
```

---

## Task 12: Push Schema and Permissions to InstantDB

- [ ] **Step 1: Initialize InstantDB project**

Create an app at https://instantdb.com/dash, get your APP_ID.

```bash
echo "EXPO_PUBLIC_INSTANT_APP_ID=your-app-id-here" >> .env
echo "INSTANT_ADMIN_TOKEN=your-admin-token-here" >> .env
```

- [ ] **Step 2: Push schema**

```bash
npx instant-cli@latest push schema
```

Review the planned changes and confirm.

- [ ] **Step 3: Push permissions**

```bash
npx instant-cli@latest push perms
```

- [ ] **Step 4: Verify the app starts**

```bash
npx expo start
```

Open the app, verify:
1. Sign-in screen renders (magic code input)
2. No console errors about missing Convex

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: finalize InstantDB setup and resolve startup issues"
```
