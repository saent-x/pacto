import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember, capFor, ensureSoloSpaceFor, requireUserId } from './lib/spaces';
import { spaceType } from './schema';

const displayNameOf = (u: { displayName?: string; name?: string; email?: string }) =>
  u.displayName ?? u.name ?? u.email ?? 'Member';

/** All spaces the caller belongs to (for the switcher). Live. */
export const mySpaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const out = [];
    for (const m of memberships) {
      const s = await ctx.db.get(m.spaceId);
      if (!s) continue;
      out.push({
        spaceId: s._id,
        type: s.type,
        name: s.name,
        role: m.role,
        memberCount: s.memberCount,
        cap: capFor(s.type),
      });
    }
    return out;
  },
});

/**
 * The app's primary context query: the signed-in user, their active space,
 * the live member roster (with profiles), and the caller's role. Drives all
 * solo/pair/crew adaptive rendering.
 */
export const currentContext = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = {
      id: userId,
      displayName: displayNameOf(user),
      email: user.email ?? null,
      avatarColor: user.avatarColor ?? null,
      themePref: user.themePref ?? null,
      accentKey: user.accentKey ?? null,
    };

    const spaceId = user.activeSpaceId;
    if (!spaceId) return { user: profile, space: null, role: null, members: [] };

    const space = await ctx.db.get(spaceId);
    if (!space) return { user: profile, space: null, role: null, members: [] };

    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .collect();

    const members = [];
    let role: 'owner' | 'member' | null = null;
    for (const m of memberships) {
      const u = await ctx.db.get(m.userId);
      if (!u) continue;
      const isYou = m.userId === userId;
      if (isYou) role = m.role;
      members.push({
        userId: m.userId,
        displayName: displayNameOf(u),
        avatarColor: u.avatarColor ?? null,
        role: m.role,
        isYou,
        joinedAt: m.joinedAt,
      });
    }
    // owners first, then you, then by join time
    members.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
      return a.joinedAt - b.joinedAt;
    });

    return {
      user: profile,
      space: {
        id: space._id,
        type: space.type,
        name: space.name,
        memberCount: space.memberCount,
        cap: capFor(space.type),
        createdAt: space._creationTime,
      },
      role,
      members,
    };
  },
});

/** Auto-create a personal (solo) space on first sign-in. Idempotent. */
export const ensureSoloSpace = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const spaceId = await ensureSoloSpaceFor(ctx, userId);
    // Solo onboarding makes the personal space active; self-heal calls (where an
    // active space already exists) leave the user's current selection untouched.
    const user = await ctx.db.get(userId);
    if (user && !user.activeSpaceId) await ctx.db.patch(userId, { activeSpaceId: spaceId });
    return spaceId;
  },
});

/** Create a pair/crew space (the creator becomes owner) and switch to it. */
export const createSpace = mutation({
  args: { type: v.union(v.literal('pair'), v.literal('crew')), name: v.string() },
  handler: async (ctx, { type, name }) => {
    const userId = await requireUserId(ctx);
    // Cap owned spaces so a signed-in user can't create unlimited rows.
    const owned = await ctx.db
      .query('spaces')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .collect();
    if (owned.length >= 50) throw new Error('SPACE_LIMIT_REACHED');
    const spaceId = await ctx.db.insert('spaces', {
      type,
      name: name.trim() || (type === 'pair' ? 'Our pact' : 'The crew'),
      createdBy: userId,
      memberCount: 1,
    });
    await ctx.db.insert('memberships', { spaceId, userId, role: 'owner', joinedAt: Date.now() });
    await ctx.db.patch(userId, { activeSpaceId: spaceId });
    // Every account keeps a personal space for solo items, even after creating
    // a pair/crew. This stays inactive — the new shared space is the active one.
    await ensureSoloSpaceFor(ctx, userId);
    return spaceId;
  },
});

/** Switch the active space (re-verifies membership). */
export const setActiveSpace = mutation({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    const { userId } = await assertMember(ctx, spaceId);
    await ctx.db.patch(userId, { activeSpaceId: spaceId });
  },
});

export { spaceType };
