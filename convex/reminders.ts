import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireActiveCouple, requireAuthenticatedUser } from "./lib/permissions";

type LooseDb = {
  insert(table: string, doc: Record<string, unknown>): Promise<string>;
  patch(id: string, updates: Record<string, unknown>): Promise<void>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<(Record<string, unknown> & { _id: string }) | null>;
  query(table: string): {
    withIndex(
      indexName: string,
      builder: (q: { eq(field: string, value: unknown): unknown }) => unknown,
    ): {
      collect(): Promise<Array<Record<string, unknown> & { _id: string }>>;
    };
  };
};

type ReminderRecord = {
  _id: string;
  coupleId: string;
  createdBy: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  dueAt: number;
  recurrence: string | null;
  isCompleted: boolean;
  completedAt: number | null;
  completedBy: string | null;
  priority: number;
  category: string | null;
  createdAt: number;
  updatedAt: number;
};

const reminderValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  createdBy: v.string(),
  assignedTo: v.union(v.string(), v.null()),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  dueAt: v.number(),
  recurrence: v.union(v.string(), v.null()),
  isCompleted: v.boolean(),
  completedAt: v.union(v.number(), v.null()),
  completedBy: v.union(v.string(), v.null()),
  priority: v.number(),
  category: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function toReminderRecord(doc: ReminderRecord): ReminderRecord {
  return {
    _id: doc._id,
    coupleId: doc.coupleId,
    createdBy: doc.createdBy,
    assignedTo: doc.assignedTo,
    title: doc.title,
    description: doc.description,
    dueAt: doc.dueAt,
    recurrence: doc.recurrence,
    isCompleted: doc.isCompleted,
    completedAt: doc.completedAt,
    completedBy: doc.completedBy,
    priority: doc.priority,
    category: doc.category,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listRemindersForCouple(db: LooseDb, coupleId: string) {
  const rows = (await db
    .query("reminders")
    .withIndex("by_coupleId", (q) => q.eq("coupleId", coupleId))
    .collect()) as ReminderRecord[];
  return rows
    .sort((left, right) => left.dueAt - right.dueAt || left.createdAt - right.createdAt)
    .map(toReminderRecord);
}

async function getReminderOrThrow(db: LooseDb, reminderId: string, coupleId: string) {
  const reminder = (await db.get(reminderId)) as ReminderRecord | null;
  if (!reminder || reminder.coupleId !== coupleId) {
    throw new Error("Reminder not found.");
  }
  return toReminderRecord(reminder);
}

export const getReminders = queryGeneric({
  args: {},
  returns: v.array(reminderValidator),
  handler: async (ctx) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    return listRemindersForCouple(db, activeCouple.couple._id);
  },
});

export const createReminder = mutationGeneric({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    dueAt: v.number(),
    recurrence: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    category: v.optional(v.union(v.string(), v.null())),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
  },
  returns: reminderValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    if (args.assignedTo) {
      const partner = activeCouple.partner;
      const validUserIds = [activeCouple.membership.userId, partner?._id].filter(Boolean);
      if (!validUserIds.includes(args.assignedTo)) {
        throw new Error("Can only assign to couple members.");
      }
    }
    const now = Date.now();
    const reminderId = await db.insert("reminders", {
      coupleId: activeCouple.couple._id,
      createdBy: user._id,
      assignedTo: args.assignedTo ?? null,
      title: args.title,
      description: args.description ?? null,
      dueAt: args.dueAt,
      recurrence: args.recurrence ?? null,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      priority: args.priority ?? 0,
      category: args.category ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return toReminderRecord({
      _id: reminderId,
      coupleId: activeCouple.couple._id,
      createdBy: user._id,
      assignedTo: args.assignedTo ?? null,
      title: args.title,
      description: args.description ?? null,
      dueAt: args.dueAt,
      recurrence: args.recurrence ?? null,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      priority: args.priority ?? 0,
      category: args.category ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReminder = mutationGeneric({
  args: {
    reminderId: v.id("reminders"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    dueAt: v.optional(v.number()),
    recurrence: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    category: v.optional(v.union(v.string(), v.null())),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
  },
  returns: reminderValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    if (args.assignedTo) {
      const partner = activeCouple.partner;
      const validUserIds = [activeCouple.membership.userId, partner?._id].filter(Boolean);
      if (!validUserIds.includes(args.assignedTo)) {
        throw new Error("Can only assign to couple members.");
      }
    }
    const existing = await getReminderOrThrow(db, args.reminderId, activeCouple.couple._id);
    const updates = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description ?? null } : {}),
      ...(args.dueAt !== undefined ? { dueAt: args.dueAt } : {}),
      ...(args.recurrence !== undefined ? { recurrence: args.recurrence ?? null } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.category !== undefined ? { category: args.category ?? null } : {}),
      ...(args.assignedTo !== undefined ? { assignedTo: args.assignedTo ?? null } : {}),
      updatedAt: Date.now(),
    };
    await db.patch(args.reminderId, updates);
    return toReminderRecord({ ...existing, ...updates });
  },
});

export const toggleReminder = mutationGeneric({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: reminderValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await getReminderOrThrow(db, args.reminderId, activeCouple.couple._id);
    const isCompleted = !existing.isCompleted;
    const updates = {
      isCompleted,
      completedAt: isCompleted ? Date.now() : null,
      completedBy: isCompleted ? user._id : null,
      updatedAt: Date.now(),
    };
    await db.patch(args.reminderId, updates);
    return toReminderRecord({ ...existing, ...updates });
  },
});

export const deleteReminder = mutationGeneric({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    await getReminderOrThrow(db, args.reminderId, activeCouple.couple._id);
    await db.delete(args.reminderId);
    return null;
  },
});
