import { query, mutation, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { assertMember, isMember, validateAssignee } from './lib/spaces';
import { cancelJob, syncTaskNotification } from './lib/notify';
import { priority } from './schema';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, val]) => val !== undefined));

// A list ref must belong to the task's own space — cross-space edits (reachable
// via getTask push-tap deep links) must not attach another space's list.
async function validateListId(ctx: QueryCtx, spaceId: Id<'spaces'>, listId?: Id<'taskLists'>) {
  if (listId === undefined) return;
  const list = await ctx.db.get(listId);
  if (!list || list.spaceId !== spaceId) throw new Error('LIST_NOT_IN_SPACE');
}

export const listTasks = query({
  args: { spaceId: v.id('spaces'), mine: v.optional(v.boolean()) },
  handler: async (ctx, { spaceId, mine }) => {
    const { userId } = await assertMember(ctx, spaceId);
    if (mine) {
      return await ctx.db
        .query('tasks')
        .withIndex('by_space_assignee', (q) => q.eq('spaceId', spaceId).eq('assigneeUserId', userId))
        .order('desc')
        .collect();
    }
    return await ctx.db
      .query('tasks')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .order('desc')
      .collect();
  },
});

export const getTask = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    const t = await ctx.db.get(taskId);
    // Ex-members get null (the sheet's "isn't available" state), not a render throw.
    if (!t || !(await isMember(ctx, t.spaceId))) return null;
    return t;
  },
});

export const createTask = mutation({
  args: {
    spaceId: v.id('spaces'),
    title: v.string(),
    listId: v.optional(v.id('taskLists')),
    list: v.optional(v.string()),
    priority: v.optional(priority),
    dueAt: v.optional(v.number()),
    dueLabel: v.optional(v.string()),
    assigneeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, a) => {
    const { userId } = await assertMember(ctx, a.spaceId);
    const assigneeUserId = await validateAssignee(ctx, a.spaceId, a.assigneeUserId);
    await validateListId(ctx, a.spaceId, a.listId);
    const taskId = await ctx.db.insert('tasks', {
      spaceId: a.spaceId,
      title: a.title,
      done: false,
      listId: a.listId,
      list: a.list,
      priority: a.priority,
      dueAt: a.dueAt,
      dueLabel: a.dueLabel,
      assigneeUserId,
      createdBy: userId,
    });
    await syncTaskNotification(ctx, taskId);
    return taskId;
  },
});

export const toggleTask = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    const t = await ctx.db.get(taskId);
    if (!t) throw new Error('NOT_FOUND');
    await assertMember(ctx, t.spaceId);
    await ctx.db.patch(taskId, { done: !t.done });
    await syncTaskNotification(ctx, taskId);
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id('tasks'),
    title: v.optional(v.string()),
    listId: v.optional(v.id('taskLists')),
    list: v.optional(v.string()),
    priority: v.optional(priority),
    done: v.optional(v.boolean()),
    dueAt: v.optional(v.number()),
    dueLabel: v.optional(v.string()),
    clearDue: v.optional(v.boolean()),
    assigneeUserId: v.optional(v.id('users')),
    clearAssignee: v.optional(v.boolean()),
    clearList: v.optional(v.boolean()),
  },
  handler: async (ctx, { taskId, clearDue, clearAssignee, clearList, ...fields }) => {
    const t = await ctx.db.get(taskId);
    if (!t) throw new Error('NOT_FOUND');
    await assertMember(ctx, t.spaceId);
    if (fields.assigneeUserId !== undefined)
      await validateAssignee(ctx, t.spaceId, fields.assigneeUserId);
    await validateListId(ctx, t.spaceId, fields.listId);

    // clean() strips undefined so "no change" args are ignored — explicit clear
    // flags are the only way an edit can unset a field.
    const patch = clean(fields) as Partial<Doc<'tasks'>>;
    if (clearDue) {
      patch.dueAt = undefined;
      patch.dueLabel = undefined;
    }
    if (clearAssignee) patch.assigneeUserId = undefined;
    if (clearList) {
      // createTask writes both the listId ref and the legacy list string.
      patch.listId = undefined;
      patch.list = undefined;
    }
    await ctx.db.patch(taskId, patch);
    await syncTaskNotification(ctx, taskId);
  },
});

export const removeTask = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    const t = await ctx.db.get(taskId);
    if (!t) throw new Error('NOT_FOUND');
    await assertMember(ctx, t.spaceId);
    // Cancel any pending notification before deletion — deleted tasks must never notify.
    await cancelJob(ctx, t.notifyJobId);
    await ctx.db.delete(taskId);
  },
});
