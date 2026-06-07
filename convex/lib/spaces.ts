import { QueryCtx, MutationCtx } from '../_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Doc, Id } from '../_generated/dataModel';

export const capFor = (type: Doc<'spaces'>['type']): number =>
  type === 'solo' ? 1 : type === 'pair' ? 2 : 8;

/** The signed-in user id, or throw. */
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error('UNAUTHENTICATED');
  return userId;
}

/**
 * Guarantee the user owns a personal (solo) space, creating one if missing.
 * Does NOT touch `activeSpaceId` — callers decide which space becomes active —
 * so it is safe to invoke alongside pair/crew creation or invite redemption
 * without hijacking the active space. Idempotent. Returns the solo space id.
 */
export async function ensureSoloSpaceFor(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<Id<'spaces'>> {
  const memberships = await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const m of memberships) {
    const s = await ctx.db.get(m.spaceId);
    if (s?.type === 'solo') return s._id;
  }
  const spaceId = await ctx.db.insert('spaces', {
    type: 'solo',
    name: 'Personal',
    createdBy: userId,
    memberCount: 1,
  });
  await ctx.db.insert('memberships', { spaceId, userId, role: 'owner', joinedAt: Date.now() });
  return spaceId;
}

/** Throw unless the caller is a member of `spaceId`. Returns userId + membership. */
export async function assertMember(ctx: QueryCtx | MutationCtx, spaceId: Id<'spaces'>) {
  const userId = await requireUserId(ctx);
  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_space_user', (q) => q.eq('spaceId', spaceId).eq('userId', userId))
    .unique();
  if (!membership) throw new Error('FORBIDDEN');
  return { userId, membership };
}

/** Stronger check for owner-only ops (invites, removing members, deleting a space). */
export async function assertOwner(ctx: QueryCtx | MutationCtx, spaceId: Id<'spaces'>) {
  const { userId, membership } = await assertMember(ctx, spaceId);
  if (membership.role !== 'owner') throw new Error('FORBIDDEN_NOT_OWNER');
  return { userId, membership };
}

/** Verify an assignee (if given) is a member of the space; returns the validated id. */
export async function validateAssignee(
  ctx: QueryCtx | MutationCtx,
  spaceId: Id<'spaces'>,
  assigneeUserId?: Id<'users'>,
): Promise<Id<'users'> | undefined> {
  if (!assigneeUserId) return undefined;
  const ok = await ctx.db
    .query('memberships')
    .withIndex('by_space_user', (q) => q.eq('spaceId', spaceId).eq('userId', assigneeUserId))
    .unique();
  if (!ok) throw new Error('ASSIGNEE_NOT_MEMBER');
  return assigneeUserId;
}
