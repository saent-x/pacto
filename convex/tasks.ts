import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireActiveCouple, requireAuthenticatedUser } from "./lib/permissions";

const taskListRecordValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  name: v.string(),
  icon: v.string(),
  color: v.string(),
  sortOrder: v.number(),
  createdBy: v.string(),
  createdAt: v.number(),
});

const taskRecordValidator = v.object({
  _id: v.string(),
  listId: v.string(),
  coupleId: v.string(),
  title: v.string(),
  notes: v.union(v.string(), v.null()),
  isCompleted: v.boolean(),
  completedAt: v.union(v.number(), v.null()),
  completedBy: v.union(v.string(), v.null()),
  assignedTo: v.union(v.string(), v.null()),
  dueDate: v.union(v.string(), v.null()),
  priority: v.number(),
  sortOrder: v.number(),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const taskBoardValidator = v.object({
  lists: v.array(taskListRecordValidator),
  tasks: v.array(taskRecordValidator),
});

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
      unique(): Promise<(Record<string, unknown> & { _id: string }) | null>;
    };
  };
};

type TaskListRecord = {
  _id: string;
  coupleId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
};

type TaskRecord = {
  _id: string;
  listId: string;
  coupleId: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  completedAt: number | null;
  completedBy: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  priority: number;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

function toTaskListRecord(doc: TaskListRecord): TaskListRecord {
  return {
    _id: doc._id,
    coupleId: doc.coupleId,
    name: doc.name,
    icon: doc.icon,
    color: doc.color,
    sortOrder: doc.sortOrder,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
  };
}

function toTaskRecord(doc: TaskRecord): TaskRecord {
  return {
    _id: doc._id,
    listId: doc.listId,
    coupleId: doc.coupleId,
    title: doc.title,
    notes: doc.notes,
    isCompleted: doc.isCompleted,
    completedAt: doc.completedAt,
    completedBy: doc.completedBy,
    assignedTo: doc.assignedTo,
    dueDate: doc.dueDate,
    priority: doc.priority,
    sortOrder: doc.sortOrder,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listTaskListsForCouple(db: LooseDb, coupleId: string) {
  const rows = (await db
    .query("taskLists")
    .withIndex("by_coupleId", (q) => q.eq("coupleId", coupleId))
    .collect()) as TaskListRecord[];
  return rows
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(toTaskListRecord);
}

async function listTasksForCouple(db: LooseDb, coupleId: string) {
  const rows = (await db
    .query("tasks")
    .withIndex("by_coupleId", (q) => q.eq("coupleId", coupleId))
    .collect()) as TaskRecord[];
  return rows
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt - right.createdAt ||
        left._id.localeCompare(right._id),
    )
    .map(toTaskRecord);
}

async function listTasksForList(db: LooseDb, listId: string) {
  const rows = (await db
    .query("tasks")
    .withIndex("by_listId", (q) => q.eq("listId", listId))
    .collect()) as TaskRecord[];
  return rows
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt - right.createdAt ||
        left._id.localeCompare(right._id),
    )
    .map(toTaskRecord);
}

async function getTaskListOrThrow(db: LooseDb, listId: string, coupleId: string) {
  const list = (await db.get(listId)) as TaskListRecord | null;
  if (!list || list.coupleId !== coupleId) {
    throw new Error("Task list not found.");
  }
  return toTaskListRecord(list);
}

async function getTaskOrThrow(db: LooseDb, taskId: string, coupleId: string) {
  const task = (await db.get(taskId)) as TaskRecord | null;
  if (!task || task.coupleId !== coupleId) {
    throw new Error("Task not found.");
  }
  return toTaskRecord(task);
}

export const getTaskBoard = queryGeneric({
  args: {},
  returns: taskBoardValidator,
  handler: async (ctx) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    const coupleId = activeCouple.couple._id;

    return {
      lists: await listTaskListsForCouple(db, coupleId),
      tasks: await listTasksForCouple(db, coupleId),
    };
  },
});

export const getTasksForList = queryGeneric({
  args: {
    listId: v.id("taskLists"),
  },
  returns: v.array(taskRecordValidator),
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    await getTaskListOrThrow(db, args.listId, activeCouple.couple._id);
    return listTasksForList(db, args.listId);
  },
});

export const createTaskList = mutationGeneric({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: taskListRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const existingLists = await listTaskListsForCouple(db, activeCouple.couple._id);

    const listId = await db.insert("taskLists", {
      coupleId: activeCouple.couple._id,
      name: args.name,
      icon: args.icon ?? "list",
      color: args.color ?? "#7BA08A",
      sortOrder: existingLists.length,
      createdBy: user._id,
      createdAt: now,
    });

    return toTaskListRecord({
      _id: listId,
      coupleId: activeCouple.couple._id,
      name: args.name,
      icon: args.icon ?? "list",
      color: args.color ?? "#7BA08A",
      sortOrder: existingLists.length,
      createdBy: user._id,
      createdAt: now,
    });
  },
});

export const deleteTaskList = mutationGeneric({
  args: {
    listId: v.id("taskLists"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    await getTaskListOrThrow(db, args.listId, activeCouple.couple._id);
    const tasks = await listTasksForList(db, args.listId);
    for (const task of tasks) {
      await db.delete(task._id);
    }
    await db.delete(args.listId);
    return null;
  },
});

export const updateTaskList = mutationGeneric({
  args: {
    listId: v.id("taskLists"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: taskListRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await getTaskListOrThrow(db, args.listId, activeCouple.couple._id);
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;
    await db.patch(args.listId, updates);
    return toTaskListRecord({ ...existing, ...updates });
  },
});

export const createTask = mutationGeneric({
  args: {
    listId: v.id("taskLists"),
    title: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
  },
  returns: taskRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const coupleId = activeCouple.couple._id;
    if (args.assignedTo) {
      const partner = activeCouple.partner;
      const validUserIds = [activeCouple.membership.userId, partner?._id].filter(Boolean);
      if (!validUserIds.includes(args.assignedTo)) {
        throw new Error("Can only assign to couple members.");
      }
    }
    await getTaskListOrThrow(db, args.listId, coupleId);
    const existingTasks = await listTasksForList(db, args.listId);
    const now = Date.now();
    const taskId = await db.insert("tasks", {
      listId: args.listId,
      coupleId,
      title: args.title,
      notes: args.notes ?? null,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      assignedTo: args.assignedTo ?? null,
      dueDate: args.dueDate ?? null,
      priority: args.priority ?? 0,
      sortOrder: existingTasks.length,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return toTaskRecord({
      _id: taskId,
      listId: args.listId,
      coupleId,
      title: args.title,
      notes: args.notes ?? null,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      assignedTo: args.assignedTo ?? null,
      dueDate: args.dueDate ?? null,
      priority: args.priority ?? 0,
      sortOrder: existingTasks.length,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTask = mutationGeneric({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
    listId: v.optional(v.id("taskLists")),
  },
  returns: taskRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    const coupleId = activeCouple.couple._id;
    if (args.assignedTo) {
      const partner = activeCouple.partner;
      const validUserIds = [activeCouple.membership.userId, partner?._id].filter(Boolean);
      if (!validUserIds.includes(args.assignedTo)) {
        throw new Error("Can only assign to couple members.");
      }
    }
    const existing = await getTaskOrThrow(db, args.taskId, coupleId);
    const nextListId = args.listId ?? existing.listId;
    if (nextListId !== existing.listId) {
      await getTaskListOrThrow(db, nextListId, coupleId);
    }
    const updates = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.notes !== undefined ? { notes: args.notes ?? null } : {}),
      ...(args.dueDate !== undefined ? { dueDate: args.dueDate ?? null } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.assignedTo !== undefined ? { assignedTo: args.assignedTo ?? null } : {}),
      ...(args.listId !== undefined ? { listId: args.listId } : {}),
      updatedAt: Date.now(),
    };
    await db.patch(args.taskId, updates);
    return toTaskRecord({
      ...existing,
      ...updates,
    });
  },
});

export const toggleTask = mutationGeneric({
  args: {
    taskId: v.id("tasks"),
  },
  returns: taskRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await getTaskOrThrow(db, args.taskId, activeCouple.couple._id);
    const isCompleted = !existing.isCompleted;
    const updates = {
      isCompleted,
      completedAt: isCompleted ? Date.now() : null,
      completedBy: isCompleted ? user._id : null,
      updatedAt: Date.now(),
    };
    await db.patch(args.taskId, updates);
    return toTaskRecord({
      ...existing,
      ...updates,
    });
  },
});

export const deleteTask = mutationGeneric({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const activeCouple = await requireActiveCouple(ctx);
    await getTaskOrThrow(db, args.taskId, activeCouple.couple._id);
    await db.delete(args.taskId);
    return null;
  },
});
