import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

// Shared validators
export const spaceType = v.union(v.literal('solo'), v.literal('pair'), v.literal('crew'));
export const memberRole = v.union(v.literal('owner'), v.literal('member'));
export const inviteStatus = v.union(
  v.literal('active'),
  v.literal('revoked'),
  v.literal('exhausted'),
);
export const priority = v.union(v.literal('low'), v.literal('med'), v.literal('high'));

export default defineSchema({
  // --- Convex Auth tables (users overridden to add profile + app fields) ---
  ...authTables,
  users: defineTable({
    // Convex Auth-managed fields:
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Pacto profile + prefs:
    displayName: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    activeSpaceId: v.optional(v.id('spaces')),
    themePref: v.optional(v.string()), // 'light' | 'dark' | 'system'
    accentKey: v.optional(v.string()),
  }).index('email', ['email']),

  // --- Spaces (solo / pair / crew) ---
  spaces: defineTable({
    type: spaceType,
    name: v.string(),
    createdBy: v.id('users'),
    memberCount: v.number(), // denormalized cap counter, kept in sync per-tx
  }).index('by_creator', ['createdBy']),

  // --- Memberships (join table users <-> spaces) ---
  memberships: defineTable({
    spaceId: v.id('spaces'),
    userId: v.id('users'),
    role: memberRole,
    joinedAt: v.number(),
  })
    .index('by_space', ['spaceId'])
    .index('by_user', ['userId'])
    .index('by_space_user', ['spaceId', 'userId']),

  // --- Invites (human codes, capped redemption) ---
  invites: defineTable({
    spaceId: v.id('spaces'),
    code: v.string(),
    createdBy: v.id('users'),
    expiresAt: v.number(),
    maxUses: v.number(),
    usedBy: v.array(v.id('users')),
    status: inviteStatus,
  })
    .index('by_code', ['code'])
    .index('by_space', ['spaceId']),

  // --- Domain tables (all space-scoped + optional per-member attribution) ---
  // User-created task lists (no defaults) — a task is filed under one.
  taskLists: defineTable({
    spaceId: v.id('spaces'),
    createdBy: v.id('users'),
    name: v.string(),
  }).index('by_space', ['spaceId']),

  tasks: defineTable({
    spaceId: v.id('spaces'),
    assigneeUserId: v.optional(v.id('users')),
    createdBy: v.id('users'),
    title: v.string(),
    done: v.boolean(),
    listId: v.optional(v.id('taskLists')),
    list: v.optional(v.string()), // legacy free-text list (pre-taskLists data)
    priority: v.optional(priority),
    dueAt: v.optional(v.number()),
    dueLabel: v.optional(v.string()),
    // Scheduled push-notification job id (_scheduled_functions), stored so we can
    // cancel/reschedule when the task is edited, completed, or deleted.
    notifyJobId: v.optional(v.string()),
  })
    .index('by_space', ['spaceId'])
    .index('by_space_assignee', ['spaceId', 'assigneeUserId']),

  reminders: defineTable({
    spaceId: v.id('spaces'),
    assigneeUserId: v.optional(v.id('users')),
    createdBy: v.id('users'),
    title: v.string(),
    remindAt: v.optional(v.number()),
    whenLabel: v.optional(v.string()),
    repeat: v.optional(v.string()),
    done: v.boolean(),
    priority: v.optional(priority),
    // IANA timezone the reminder time was set in — used to compute recurring
    // occurrences at the same local wall-clock time (DST/weekday/month correct).
    tz: v.optional(v.string()),
    // Scheduled push-notification job id (_scheduled_functions); see tasks.notifyJobId.
    notifyJobId: v.optional(v.string()),
  })
    .index('by_space', ['spaceId'])
    .index('by_space_assignee', ['spaceId', 'assigneeUserId']),

  checkins: defineTable({
    spaceId: v.id('spaces'),
    createdBy: v.id('users'),
    mood: v.string(), // MoodId
    energy: v.optional(v.number()),
    note: v.optional(v.string()),
  })
    .index('by_space', ['spaceId'])
    .index('by_space_user', ['spaceId', 'createdBy']),

  timetables: defineTable({
    spaceId: v.id('spaces'),
    createdBy: v.id('users'),
    title: v.string(),
    share: v.optional(v.string()),
    days: v.optional(v.number()),
    items: v.array(
      v.object({ time: v.string(), title: v.string(), dur: v.optional(v.string()) }),
    ),
  }).index('by_space', ['spaceId']),

  calendarEvents: defineTable({
    spaceId: v.id('spaces'),
    assigneeUserId: v.optional(v.id('users')),
    createdBy: v.id('users'),
    title: v.string(),
    loc: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
  })
    .index('by_space', ['spaceId'])
    .index('by_space_assignee', ['spaceId', 'assigneeUserId'])
    .index('by_space_time', ['spaceId', 'startsAt']),

  // --- AI agent threads + messages (space-scoped chat history + tool-action audit) ---
  aiThreads: defineTable({
    spaceId: v.id('spaces'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    lastAt: v.number(),
  })
    .index('by_space', ['spaceId'])
    .index('by_user', ['userId']),

  aiMessages: defineTable({
    threadId: v.id('aiThreads'),
    spaceId: v.id('spaces'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('tool')),
    text: v.string(),
    toolName: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_thread', ['threadId']),

  // --- Per-user fixed-window rate limiter for paid AI paths (cost-abuse guard) ---
  aiRateLimits: defineTable({
    userId: v.id('users'),
    kind: v.string(), // 'realtime' | 'whisper'
    windowStart: v.number(),
    count: v.number(),
  }).index('by_user_kind', ['userId', 'kind']),

  // --- Expo push notification tokens (one row per device per user) ---
  pushTokens: defineTable({
    userId: v.id('users'),
    token: v.string(), // ExpoPushToken[...]
    platform: v.optional(v.string()), // 'ios' | 'android'
    deviceName: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token']),
});
