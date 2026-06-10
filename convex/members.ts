import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember, assertOwner, requireUserId } from './lib/spaces';

/** Owner removes a member (cannot remove themselves here — use leaveSpace). */
export const removeMember = mutation({
  args: { spaceId: v.id('spaces'), userId: v.id('users') },
  handler: async (ctx, { spaceId, userId: target }) => {
    const { userId: me } = await assertOwner(ctx, spaceId);
    if (target === me) throw new Error('USE_LEAVE_SPACE');
    const membership = await ctx.db
      .query('memberships')
      .withIndex('by_space_user', (q) => q.eq('spaceId', spaceId).eq('userId', target))
      .unique();
    if (!membership) throw new Error('NOT_A_MEMBER');
    await ctx.db.delete(membership._id);
    const space = await ctx.db.get(spaceId);
    if (space) await ctx.db.patch(spaceId, { memberCount: Math.max(1, space.memberCount - 1) });
    // Move the removed user off this space if it was active.
    const u = await ctx.db.get(target);
    if (u?.activeSpaceId === spaceId) await ctx.db.patch(target, { activeSpaceId: undefined });
  },
});

/** Leave a space you belong to (owners of multi-member spaces must transfer first — simplified: blocked). */
export const leaveSpace = mutation({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    const { membership } = await assertMember(ctx, spaceId);
    const userId = await requireUserId(ctx);
    const space = await ctx.db.get(spaceId);
    if (!space) throw new Error('NOT_FOUND');
    if (space.type === 'solo') throw new Error('CANNOT_LEAVE_SOLO');
    if (membership.role === 'owner' && space.memberCount > 1)
      throw new Error('OWNER_MUST_TRANSFER_FIRST');

    await ctx.db.delete(membership._id);
    await ctx.db.patch(spaceId, { memberCount: Math.max(0, space.memberCount - 1) });

    // Fall back to the user's solo space (or null).
    const remaining = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    let next = null;
    for (const m of remaining) {
      const s = await ctx.db.get(m.spaceId);
      if (s?.type === 'solo') {
        next = s._id;
        break;
      }
    }
    if (!next && remaining[0]) next = remaining[0].spaceId;
    await ctx.db.patch(userId, { activeSpaceId: next ?? undefined });
  },
});
