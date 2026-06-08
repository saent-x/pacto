import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { assertMember, validateAssignee } from './lib/spaces';
import { cancelJob, syncReminderNotification } from './lib/notify';
import { priority } from './schema';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, val]) => val !== undefined));

export const listReminders = query({
  args: { spaceId: v.id('spaces'), mine: v.optional(v.boolean()) },
  handler: async (ctx, { spaceId, mine }) => {
    const { userId } = await assertMember(ctx, spaceId);
    if (mine) {
      return await ctx.db
        .query('reminders')
        .withIndex('by_space_assignee', (q) => q.eq('spaceId', spaceId).eq('assigneeUserId', userId))
        .order('desc')
        .collect();
    }
    return await ctx.db
      .query('reminders')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .order('desc')
      .collect();
  },
});

export const createReminder = mutation({
  args: {
    spaceId: v.id('spaces'),
    title: v.string(),
    remindAt: v.optional(v.number()),
    whenLabel: v.optional(v.string()),
    repeat: v.optional(v.string()),
    priority: v.optional(priority),
    tz: v.optional(v.string()),
    assigneeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, a) => {
    const { userId } = await assertMember(ctx, a.spaceId);
    const assigneeUserId = await validateAssignee(ctx, a.spaceId, a.assigneeUserId);
    const reminderId = await ctx.db.insert('reminders', {
      spaceId: a.spaceId,
      title: a.title,
      remindAt: a.remindAt,
      whenLabel: a.whenLabel,
      repeat: a.repeat,
      priority: a.priority,
      tz: a.tz,
      done: false,
      assigneeUserId,
      createdBy: userId,
    });
    await syncReminderNotification(ctx, reminderId);
    return reminderId;
  },
});

export const toggleReminder = mutation({
  args: { reminderId: v.id('reminders') },
  handler: async (ctx, { reminderId }) => {
    const r = await ctx.db.get(reminderId);
    if (!r) throw new Error('NOT_FOUND');
    await assertMember(ctx, r.spaceId);
    await ctx.db.patch(reminderId, { done: !r.done });
    await syncReminderNotification(ctx, reminderId);
  },
});

export const updateReminder = mutation({
  args: {
    reminderId: v.id('reminders'),
    title: v.optional(v.string()),
    remindAt: v.optional(v.number()),
    whenLabel: v.optional(v.string()),
    repeat: v.optional(v.string()),
    priority: v.optional(priority),
    tz: v.optional(v.string()),
    done: v.optional(v.boolean()),
    assigneeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, { reminderId, ...fields }) => {
    const r = await ctx.db.get(reminderId);
    if (!r) throw new Error('NOT_FOUND');
    await assertMember(ctx, r.spaceId);
    if (fields.assigneeUserId !== undefined)
      await validateAssignee(ctx, r.spaceId, fields.assigneeUserId);
    await ctx.db.patch(reminderId, clean(fields) as Partial<Doc<'reminders'>>);
    await syncReminderNotification(ctx, reminderId);
  },
});

export const removeReminder = mutation({
  args: { reminderId: v.id('reminders') },
  handler: async (ctx, { reminderId }) => {
    const r = await ctx.db.get(reminderId);
    if (!r) throw new Error('NOT_FOUND');
    await assertMember(ctx, r.spaceId);
    // Cancel any pending notification before the row is gone — deleted reminders
    // must never notify (the delivery action also re-checks, as a backstop).
    await cancelJob(ctx, r.notifyJobId);
    await ctx.db.delete(reminderId);
  },
});
