import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember, requireUserId } from './lib/spaces';

export const listCheckins = query({
  args: { spaceId: v.id('spaces'), limit: v.optional(v.number()) },
  handler: async (ctx, { spaceId, limit }) => {
    await assertMember(ctx, spaceId);
    return await ctx.db
      .query('checkins')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .order('desc')
      .take(limit ?? 100);
  },
});

/** The most recent check-in per member (powers the shared "Today's pulse"). */
export const latestByMember = query({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    await assertMember(ctx, spaceId);
    const rows = await ctx.db
      .query('checkins')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .order('desc')
      .take(200);
    const seen = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (!seen.has(r.createdBy)) seen.set(r.createdBy, r);
    }
    return Array.from(seen.values()).map((r) => ({
      userId: r.createdBy,
      mood: r.mood,
      energy: r.energy ?? null,
      at: r._creationTime,
    }));
  },
});

export const createCheckin = mutation({
  args: {
    spaceId: v.id('spaces'),
    mood: v.string(),
    energy: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const { userId } = await assertMember(ctx, a.spaceId);
    return await ctx.db.insert('checkins', {
      spaceId: a.spaceId,
      mood: a.mood,
      energy: a.energy,
      note: a.note,
      createdBy: userId,
    });
  },
});

export const removeCheckin = mutation({
  args: { checkinId: v.id('checkins') },
  handler: async (ctx, { checkinId }) => {
    const c = await ctx.db.get(checkinId);
    if (!c) throw new Error('NOT_FOUND');
    const userId = await requireUserId(ctx);
    await assertMember(ctx, c.spaceId);
    if (c.createdBy !== userId) throw new Error('NOT_YOUR_CHECKIN');
    await ctx.db.delete(checkinId);
  },
});
