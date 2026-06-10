import { mutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requireUserId } from './lib/spaces';

const DISPLAY_NAME_LIMIT = 48;

const normalizeDisplayName = (value: string) => {
  const displayName = value.trim().replace(/\s+/g, ' ');
  if (!displayName) throw new Error('DISPLAY_NAME_REQUIRED');
  if (displayName.length > DISPLAY_NAME_LIMIT) throw new Error('DISPLAY_NAME_TOO_LONG');
  return displayName;
};

export const updateProfile = mutation({
  args: { displayName: v.optional(v.string()), avatarColor: v.optional(v.string()) },
  handler: async (ctx, { displayName, avatarColor }) => {
    const userId = await requireUserId(ctx);
    const patch: { displayName?: string; avatarColor?: string } = {};
    if (displayName !== undefined) patch.displayName = normalizeDisplayName(displayName);
    if (avatarColor !== undefined) patch.avatarColor = avatarColor;
    if (Object.keys(patch).length > 0) await ctx.db.patch(userId, patch);
  },
});

export const updatePrefs = mutation({
  args: { themePref: v.optional(v.string()), accentKey: v.optional(v.string()) },
  handler: async (ctx, { themePref, accentKey }) => {
    const userId = await requireUserId(ctx);
    const patch: { themePref?: string; accentKey?: string } = {};
    if (themePref !== undefined) patch.themePref = themePref;
    if (accentKey !== undefined) patch.accentKey = accentKey;
    await ctx.db.patch(userId, patch);
  },
});

const wipe = async (ctx: MutationCtx, rows: { _id: any }[]) => {
  for (const r of rows) await ctx.db.delete(r._id);
};

// Delete every space-scoped row for a space that's being torn down.
async function purgeSpaceData(ctx: MutationCtx, spaceId: Id<'spaces'>) {
  const bySpace = (b: any) => b.eq('spaceId', spaceId);
  await wipe(ctx, await ctx.db.query('tasks').withIndex('by_space', bySpace).collect());
  await wipe(ctx, await ctx.db.query('reminders').withIndex('by_space', bySpace).collect());
  await wipe(ctx, await ctx.db.query('checkins').withIndex('by_space', bySpace).collect());
  await wipe(ctx, await ctx.db.query('timetables').withIndex('by_space', bySpace).collect());
  await wipe(ctx, await ctx.db.query('calendarEvents').withIndex('by_space', bySpace).collect());
  await wipe(ctx, await ctx.db.query('invites').withIndex('by_space', bySpace).collect());
  const threads = await ctx.db.query('aiThreads').withIndex('by_space', bySpace).collect();
  for (const th of threads) {
    await wipe(ctx, await ctx.db.query('aiMessages').withIndex('by_thread', (b) => b.eq('threadId', th._id)).collect());
    await ctx.db.delete(th._id);
  }
}

/**
 * Permanently delete the signed-in user's account. Tears down sole-owned spaces
 * and their data, hands ownership of shared spaces to the next member, and
 * removes the user's auth records + profile. Irreversible.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    for (const m of memberships) {
      const space = await ctx.db.get(m.spaceId);
      const members = await ctx.db
        .query('memberships')
        .withIndex('by_space', (q) => q.eq('spaceId', m.spaceId))
        .collect();
      const others = members.filter((x) => x.userId !== userId);

      if (others.length === 0) {
        // Sole member → remove the whole space and all of its data.
        await purgeSpaceData(ctx, m.spaceId);
        for (const x of members) await ctx.db.delete(x._id);
        if (space) await ctx.db.delete(space._id);
      } else {
        // Hand ownership to the earliest-joined remaining member if needed.
        if (m.role === 'owner') {
          const heir = [...others].sort((a, b) => a.joinedAt - b.joinedAt)[0];
          await ctx.db.patch(heir._id, { role: 'owner' });
        }
        await ctx.db.delete(m._id);
        if (space) await ctx.db.patch(space._id, { memberCount: Math.max(0, space.memberCount - 1) });
      }
    }

    // Personal AI threads left in any surviving shared space.
    const myThreads = await ctx.db
      .query('aiThreads')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    for (const th of myThreads) {
      await wipe(ctx, await ctx.db.query('aiMessages').withIndex('by_thread', (q) => q.eq('threadId', th._id)).collect());
      await ctx.db.delete(th._id);
    }

    // Device push tokens registered to this user.
    await wipe(
      ctx,
      await ctx.db.query('pushTokens').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
    );

    // Auth records: sessions (+ refresh tokens), accounts (+ verification codes).
    const sessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect();
    for (const s of sessions) {
      await wipe(ctx, await ctx.db.query('authRefreshTokens').withIndex('sessionId', (q) => q.eq('sessionId', s._id)).collect());
      await ctx.db.delete(s._id);
    }
    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();
    for (const a of accounts) {
      await wipe(ctx, await ctx.db.query('authVerificationCodes').withIndex('accountId', (q) => q.eq('accountId', a._id)).collect());
      await ctx.db.delete(a._id);
    }

    await ctx.db.delete(userId);
    return { ok: true };
  },
});
