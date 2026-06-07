import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember, requireUserId } from './lib/spaces';

/**
 * Single gate the paid AI actions (ai.realtimeToken, aiNode.whisperTurn) MUST
 * pass through before spending any OpenAI money. It runs as a mutation so the
 * rate-limit write is transactional, and is internal-only so it can't be
 * bypassed from a client. It establishes:
 *   1. Authentication — the caller is a signed-in user (else UNAUTHENTICATED).
 *   2. Authorization — if a spaceId is given, the caller is a member (else FORBIDDEN).
 *   3. Rate limiting — a per-user fixed-window cap per `kind` (else RATE_LIMITED),
 *      so an authenticated user can't loop the paid endpoints to run up cost.
 * Returns the resolved userId.
 */
export const guard = internalMutation({
  args: {
    kind: v.string(), // 'realtime' | 'whisper'
    limit: v.number(), // max calls allowed per window
    windowMs: v.number(), // window length in ms
    spaceId: v.optional(v.id('spaces')),
  },
  handler: async (ctx, { kind, limit, windowMs, spaceId }) => {
    // 1 + 2: identity, and membership if the call is space-scoped.
    const userId = spaceId
      ? (await assertMember(ctx, spaceId)).userId
      : await requireUserId(ctx);

    // 3: fixed-window per-user rate limit.
    const now = Date.now();
    const existing = await ctx.db
      .query('aiRateLimits')
      .withIndex('by_user_kind', (q) => q.eq('userId', userId).eq('kind', kind))
      .unique();

    if (!existing || now - existing.windowStart >= windowMs) {
      if (existing) await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      else await ctx.db.insert('aiRateLimits', { userId, kind, windowStart: now, count: 1 });
      return { userId };
    }
    if (existing.count >= limit) throw new Error('RATE_LIMITED');
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { userId };
  },
});
