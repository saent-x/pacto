import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { assertMember, isMember, validateAssignee } from './lib/spaces';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, val]) => val !== undefined));

export const listEvents = query({
  args: { spaceId: v.id('spaces'), from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, { spaceId, from, to }) => {
    await assertMember(ctx, spaceId);
    if (from !== undefined && to !== undefined) {
      return await ctx.db
        .query('calendarEvents')
        .withIndex('by_space_time', (q) =>
          q.eq('spaceId', spaceId).gte('startsAt', from).lte('startsAt', to),
        )
        .collect();
    }
    return await ctx.db
      .query('calendarEvents')
      .withIndex('by_space_time', (q) => q.eq('spaceId', spaceId))
      .collect();
  },
});

export const getEvent = query({
  args: { eventId: v.id('calendarEvents') },
  handler: async (ctx, { eventId }) => {
    const e = await ctx.db.get(eventId);
    // Ex-members get null (the sheet's "isn't available" state), not a render throw.
    if (!e || !(await isMember(ctx, e.spaceId))) return null;
    return e;
  },
});

export const createEvent = mutation({
  args: {
    spaceId: v.id('spaces'),
    title: v.string(),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    loc: v.optional(v.string()),
    assigneeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, a) => {
    const { userId } = await assertMember(ctx, a.spaceId);
    const assigneeUserId = await validateAssignee(ctx, a.spaceId, a.assigneeUserId);
    return await ctx.db.insert('calendarEvents', {
      spaceId: a.spaceId,
      title: a.title,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      loc: a.loc,
      assigneeUserId,
      createdBy: userId,
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id('calendarEvents'),
    title: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    loc: v.optional(v.string()),
    clearLoc: v.optional(v.boolean()),
    assigneeUserId: v.optional(v.id('users')),
    clearAssignee: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, clearAssignee, clearLoc, ...fields }) => {
    const e = await ctx.db.get(eventId);
    if (!e) throw new Error('NOT_FOUND');
    await assertMember(ctx, e.spaceId);
    if (fields.assigneeUserId !== undefined)
      await validateAssignee(ctx, e.spaceId, fields.assigneeUserId);
    // clean() strips undefined, so unsetting a field needs an explicit flag.
    const patch = clean(fields) as Partial<Doc<'calendarEvents'>>;
    if (clearAssignee) patch.assigneeUserId = undefined;
    if (clearLoc) patch.loc = undefined;
    await ctx.db.patch(eventId, patch);
  },
});

export const removeEvent = mutation({
  args: { eventId: v.id('calendarEvents') },
  handler: async (ctx, { eventId }) => {
    const e = await ctx.db.get(eventId);
    if (!e) throw new Error('NOT_FOUND');
    await assertMember(ctx, e.spaceId);
    await ctx.db.delete(eventId);
  },
});
