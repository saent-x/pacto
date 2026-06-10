import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember } from './lib/spaces';

export const listLists = query({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    await assertMember(ctx, spaceId);
    return await ctx.db
      .query('taskLists')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .collect();
  },
});

export const createList = mutation({
  args: { spaceId: v.id('spaces'), name: v.string() },
  handler: async (ctx, { spaceId, name }) => {
    const { userId } = await assertMember(ctx, spaceId);
    return await ctx.db.insert('taskLists', { spaceId, createdBy: userId, name: name.trim() || 'List' });
  },
});

// Delete a list. Its tasks are unfiled (kept), not deleted.
export const removeList = mutation({
  args: { listId: v.id('taskLists') },
  handler: async (ctx, { listId }) => {
    const list = await ctx.db.get(listId);
    if (!list) return;
    await assertMember(ctx, list.spaceId);
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_space', (q) => q.eq('spaceId', list.spaceId))
      .collect();
    for (const t of tasks) if (t.listId === listId) await ctx.db.patch(t._id, { listId: undefined });
    await ctx.db.delete(listId);
  },
});
