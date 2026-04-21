# Phase 2a — Tasks + Reminders

## Goal

Wire InstantDB to the Tasks tab (lists + items) and Reminders tab. Replace all seed data with live queries, wire the three create sheets (new-list, new-task, new-reminder), and add toggle/delete/update actions. Establishes the CRUD patterns reused by Phases 2b and 2c.

## Non-goals

- Push notifications for reminders — Phase 3
- Drag-to-reorder — later pass
- Assignee UI on solo spaces — hidden via `isSolo`
- Full-text search — later
- Offline-first semantics beyond what InstantDB gives out of the box

## Architecture

```
Data                                 UI
────                                 ──
instant.schema.ts  ─────┐
  + task_lists          │   useTaskLists()  ──┐
  + tasks               ├── useTasks(listId) ─┼── tasks screens + sheets
  + reminders           │   useReminders()    ─┘
                        │
instant.perms.ts  ──────┘
  + row-level = member of space
```

Three hooks in `src/lib/features/`:

- `src/lib/features/task-lists.ts` — `useTaskLists()`, `createTaskList()`, `updateTaskList()`, `deleteTaskList()`
- `src/lib/features/tasks.ts` — `useTasks(listId)`, `createTask()`, `toggleTask()`, `updateTask()`, `deleteTask()`
- `src/lib/features/reminders.ts` — `useReminders()`, `createReminder()`, `toggleReminder()`, `updateReminder()`, `deleteReminder()`, `advanceRecurring()`

Each exports a query-hook + mutation helpers. No service classes, no reducers. Each hook file is one responsibility; ~120 lines max.

## Schema additions

Adds three entities + their link definitions. `$users`, `spaces`, `memberships` stay as-is from Phase 1.

```ts
i.schema({
  entities: {
    // ... existing $users, spaces, memberships

    taskLists: i.entity({
      name: i.string(),
      icon: i.string(),          // IconName from our icon set
      color: i.string(),         // pastel key: 'peach' | 'lavender' | ... | hex fallback
      category: i.string().optional(), // 'Travel' | 'Home' | 'Date' | 'Work' | 'Solo' | free
      archived: i.boolean(),
      sortOrder: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    tasks: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      done: i.boolean(),
      completedAt: i.number().optional(),
      dueAt: i.number().optional(),         // ms timestamp, nullable for "Later"
      priority: i.string(),                 // 'low' | 'med' | 'high'
      sortOrder: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    reminders: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      dueAt: i.number().indexed(),          // ms timestamp, required
      priority: i.string(),                 // 'low' | 'med' | 'high'
      category: i.string().optional(),
      recurrence: i.string(),               // 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
      done: i.boolean(),
      completedAt: i.number().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
  },
  links: {
    // Existing links from Phase 1

    taskListSpace: {
      forward: { on: 'taskLists', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'taskLists' },
    },
    taskListCreator: {
      forward: { on: 'taskLists', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTaskLists' },
    },

    taskList: {
      forward: { on: 'tasks', has: 'one', label: 'list', onDelete: 'cascade' },
      reverse: { on: 'taskLists', has: 'many', label: 'tasks' },
    },
    taskCreator: {
      forward: { on: 'tasks', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTasks' },
    },
    taskAssignee: {
      forward: { on: 'tasks', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedTasks' },
    },
    taskCompleter: {
      forward: { on: 'tasks', has: 'one', label: 'completedBy' },
      reverse: { on: '$users', has: 'many', label: 'completedTasks' },
    },

    reminderSpace: {
      forward: { on: 'reminders', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'reminders' },
    },
    reminderCreator: {
      forward: { on: 'reminders', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdReminders' },
    },
    reminderAssignee: {
      forward: { on: 'reminders', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedReminders' },
    },
  },
});
```

Tasks link to `list` (which links to `space`) — no direct task→space link. Keeps schema clean. Query `tasks` via `list.space.id` filter.

## Permissions

Row-level: only members of the space can view/write.

```ts
{
  taskLists: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "auth.id != null && auth.id in newData.ref('space.memberships.user.id')",
      update: "auth.id in data.ref('space.memberships.user.id')",
      delete: "auth.id in data.ref('space.memberships.user.id')",
    },
  },
  tasks: {
    allow: {
      view: "auth.id in data.ref('list.space.memberships.user.id')",
      create: "auth.id != null && auth.id in newData.ref('list.space.memberships.user.id')",
      update: "auth.id in data.ref('list.space.memberships.user.id')",
      delete: "auth.id in data.ref('list.space.memberships.user.id')",
    },
  },
  reminders: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "auth.id != null && auth.id in newData.ref('space.memberships.user.id')",
      update: "auth.id in data.ref('space.memberships.user.id')",
      delete: "auth.id in data.ref('space.memberships.user.id')",
    },
  },
}
```

## Derived state (client)

### Bucketing by due date

Tasks + reminders bucket into dated sections purely on the client. One helper:

```ts
// src/lib/features/buckets.ts
export type Bucket =
  | 'Overdue' | 'Today' | 'Tomorrow' | 'This week'
  | string  /* month short name, e.g. 'May' */
  | 'Later';

export function bucketFor(dueAt: number | null | undefined, now = Date.now()): Bucket;
export function formatDue(dueAt: number | null | undefined, now = Date.now()): string;
```

Order: `Overdue` → `Today` → `Tomorrow` → `This week` → month names in ascending order → `Later`.

### Recurrence advance

`src/lib/features/recurrence.ts`:

```ts
export function advanceDueAt(current: number, rule: string): number;
// 'daily' → +1 day, 'weekly' → +7, 'monthly' → +1 calendar month,
// 'yearly' → +1 calendar year, 'none' → returns current (noop)
```

When a recurring reminder is toggled done:
1. Compute `next = advanceDueAt(dueAt, recurrence)`
2. Update same reminder row: `dueAt = next`, `done = false`, `completedAt = undefined`
3. Keep it visible as upcoming

When non-recurring reminder toggled done: set `done = true`, `completedAt = now`.

## Screen wiring

### `app/(tabs)/tasks/index.tsx`

- Replace `TASK_LISTS` import with `useTaskLists()` hook
- Each list card renders `{ done }/{ total }` from `list.tasks` aggregated counts
- Tap → `router.push('/tasks/[listId]')`
- `+` → `router.push('/sheets/new-list')`
- Remove filter by "who" when `isSolo` (or always show, since assignee is optional per task)

### `app/(tabs)/tasks/[listId].tsx`

- Replace `SEED` with `useTasks(listId)`
- `toggle()` → `toggleTask({ id, done })`
- New task FAB → `router.push({ pathname: '/sheets/new-task', params: { listId } })`
- Row long-press → confirm + `deleteTask({ id })`

### `app/(tabs)/reminders/index.tsx`

- Replace `SEED` with `useReminders()`
- Filter pills stay: All / Mine / Partner / Shared / Overdue (collapses to All / Mine / Overdue when solo)
- `toggle()` calls recurrence-aware completion
- `+` → `router.push('/sheets/new-reminder')`

### Sheets

**`app/sheets/new-list.tsx`** — gather `{ name, icon, color }` → `createTaskList({ name, icon, color })`. Close on success. Show error inline.

**`app/sheets/new-task.tsx`** — receives `{ listId }` from route params. Gather `{ title, notes, dueAt, priority }`. Optional assignee select (hidden when solo). Replace the hardcoded date/time field with a platform date picker (iOS `DateTimePicker` from `@react-native-community/datetimepicker` — already in deps). `createTask({ listId, ... })`.

**`app/sheets/new-reminder.tsx`** — Gather `{ title, notes, dueAt, priority, category, recurrence }`. `createReminder({ ... })`. Same date-picker treatment.

## Error + loading states

- `useQuery` returns `{ isLoading, data, error }`. Screens:
  - `isLoading` first time → render existing-looking skeleton (3 placeholder cards)
  - `error` → inline banner "Couldn't load — pull to refresh" with retry via `db.refresh()` (if exposed) or simple re-mount
  - Empty data → existing empty-state illustrations kept from design

- Mutations: `try/catch` around `db.transact`. On error: `Alert.alert('Save failed', err.message)`. Don't block UI beyond the button busy state.

## Optimistic updates

InstantDB is optimistic by default — mutations reflect locally immediately and reconcile from server. Keep that — no manual optimistic layer.

## File plan

```
src/lib/features/
  task-lists.ts       (new)  ~120 lines
  tasks.ts            (new)  ~120 lines
  reminders.ts        (new)  ~140 lines
  buckets.ts          (new)  ~60 lines
  recurrence.ts       (new)  ~50 lines

instant.schema.ts     (modify) add 3 entities + 9 links
instant.perms.ts      (modify) add rules for 3 entities

app/(tabs)/tasks/index.tsx        (modify) remove seed, use hook
app/(tabs)/tasks/[listId].tsx     (modify) remove seed, use hook
app/(tabs)/reminders/index.tsx    (modify) remove seed, use hook

app/sheets/new-list.tsx           (modify) wire createTaskList
app/sheets/new-task.tsx           (modify) wire createTask, accept listId param
app/sheets/new-reminder.tsx       (modify) wire createReminder

src/lib/tasks-data.ts             (delete) no longer needed
```

## Verification

Manual smoke after implementation:
- Create list → appears on tasks index
- Open list → create task → appears in `[listId]` detail
- Toggle task → moves to Done section
- Long-press task → delete → removed
- Create reminder with `weekly` recurrence → toggle done → re-appears with `dueAt` +7 days, still not done
- Non-recurring reminder → toggle done → moves to Done section
- Overdue bucket correctly groups reminders with `dueAt < now`
- Couple: both devices see each other's lists/tasks/reminders
- Solo: assignee controls hidden on sheets; filter strip collapses

## Out of scope for Phase 2a

- Push notifications (Phase 3)
- Drag-to-reorder (later)
- Task priorities on task lists (lists have no priority)
- Offline conflict resolution UI (InstantDB handles at client layer)
- Search across lists
