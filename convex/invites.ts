import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertOwner, capFor, ensureSoloSpaceFor, requireUserId } from './lib/spaces';

// Ambiguity-free alphabet (no 0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function genCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  return `${pick(3)}-${pick(3)}`; // e.g. "K7P-Q2M"
}

/** Owner generates an invite. Solo spaces cannot be shared. */
export const createInvite = mutation({
  args: { spaceId: v.id('spaces'), ttlHours: v.optional(v.number()) },
  handler: async (ctx, { spaceId, ttlHours }) => {
    const { userId } = await assertOwner(ctx, spaceId);
    const space = await ctx.db.get(spaceId);
    if (!space) throw new Error('NOT_FOUND');
    if (space.type === 'solo') throw new Error('SOLO_NOT_SHAREABLE');

    const remaining = capFor(space.type) - space.memberCount;
    if (remaining <= 0) throw new Error('SPACE_FULL');

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('invites')
        .withIndex('by_code', (q) => q.eq('code', code))
        .first();
      if (!clash || clash.status !== 'active') break;
      code = genCode();
    }

    const inviteId = await ctx.db.insert('invites', {
      spaceId,
      code,
      createdBy: userId,
      expiresAt: Date.now() + (ttlHours ?? 72) * 3600_000,
      maxUses: remaining,
      usedBy: [],
      status: 'active',
    });
    return { inviteId, code, link: `pacto://join/${code}` };
  },
});

/** Active invites for a space (owner view). */
export const listInvites = query({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    await assertOwner(ctx, spaceId);
    const invites = await ctx.db
      .query('invites')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .collect();
    return invites
      .filter((i) => i.status === 'active' && i.expiresAt > Date.now())
      .map((i) => ({
        id: i._id,
        code: i.code,
        link: `pacto://join/${i.code}`,
        expiresAt: i.expiresAt,
        seatsLeft: i.maxUses - i.usedBy.length,
      }));
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id('invites') },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error('NOT_FOUND');
    await assertOwner(ctx, invite.spaceId);
    await ctx.db.patch(inviteId, { status: 'revoked' });
  },
});

/** Anyone signed in can redeem. Returns the spaceId joined. Race-safe (single tx). */
export const redeemInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const normalized = code.trim().toUpperCase();

    const invite = await ctx.db
      .query('invites')
      .withIndex('by_code', (q) => q.eq('code', normalized))
      .first();

    if (!invite) throw new Error('INVALID_CODE');
    if (invite.status !== 'active') throw new Error('INVITE_INACTIVE');
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: 'revoked' });
      throw new Error('EXPIRED');
    }
    if (invite.usedBy.length >= invite.maxUses) {
      await ctx.db.patch(invite._id, { status: 'exhausted' });
      throw new Error('INVITE_FULL');
    }

    // The invite is valid and we're committed to joining: guarantee the joiner
    // keeps a personal (solo) space for their own items. Leaves activeSpaceId to
    // the join logic below, which makes the invited space active.
    await ensureSoloSpaceFor(ctx, userId);

    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_space_user', (q) => q.eq('spaceId', invite.spaceId).eq('userId', userId))
      .unique();
    if (existing) {
      await ctx.db.patch(userId, { activeSpaceId: invite.spaceId });
      return { spaceId: invite.spaceId, alreadyMember: true };
    }

    const space = await ctx.db.get(invite.spaceId);
    if (!space) throw new Error('NOT_FOUND');
    if (space.memberCount >= capFor(space.type)) {
      await ctx.db.patch(invite._id, { status: 'exhausted' });
      throw new Error('SPACE_FULL');
    }

    await ctx.db.insert('memberships', {
      spaceId: invite.spaceId,
      userId,
      role: 'member',
      joinedAt: Date.now(),
    });
    await ctx.db.patch(invite.spaceId, { memberCount: space.memberCount + 1 });

    const usedBy = [...invite.usedBy, userId];
    await ctx.db.patch(invite._id, {
      usedBy,
      status: usedBy.length >= invite.maxUses ? 'exhausted' : 'active',
    });

    await ctx.db.patch(userId, { activeSpaceId: invite.spaceId });
    return { spaceId: invite.spaceId, alreadyMember: false };
  },
});
