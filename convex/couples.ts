import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  deriveInviteCode,
  resolveActiveCoupleForUser,
  resolveCurrentSession,
  upsertCurrentUser,
  type CoupleRecord,
  coupleRecordValidator,
  membershipRecordValidator,
  activeCoupleSummaryValidator,
  presenceSummaryValidator,
} from "./lib/auth";
import {
  getMembershipForUserAndCouple,
  listActiveMembershipsForCouple,
} from "./memberships";

function toCoupleRecord(
  couple: CoupleRecord,
  inviteCode: string | null,
) {
  return {
    ...couple,
    inviteCode,
  };
}

type LooseDb = {
  insert(table: string, doc: Record<string, unknown>): Promise<string>;
  patch(id: string, updates: Record<string, unknown>): Promise<void>;
  query(table: string): {
    withIndex(
      indexName: string,
      builder: (q: { eq(field: string, value: unknown): unknown }) => unknown,
    ): {
      collect(): Promise<Array<Record<string, unknown> & { _id: string }>>;
      unique(): Promise<(Record<string, unknown> & { _id: string }) | null>;
    };
  };
};

async function findCoupleByInviteCode(db: LooseDb, inviteCode: string) {
  return (await db
    .query("couples")
    .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
    .unique()) as CoupleRecord | null;
}

export const createCouple = mutationGeneric({
  args: {
    name: v.string(),
    anniversary: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    couple: coupleRecordValidator,
    membership: membershipRecordValidator,
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const db = ctx.db as LooseDb;
    const user = await upsertCurrentUser(ctx);
    const activeCouple = await resolveActiveCoupleForUser(ctx, user._id);
    if (activeCouple) {
      throw new ConvexError("You already belong to a couple.");
    }

    let inviteCode = deriveInviteCode([]);
    while (await findCoupleByInviteCode(db, inviteCode)) {
      inviteCode = deriveInviteCode([]);
    }
    const now = Date.now();

    const coupleId = await db.insert("couples", {
      name: args.name,
      inviteCode,
      anniversary: args.anniversary ?? null,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    const membershipId = await db.insert("memberships", {
      userId: user._id,
      coupleId,
      role: "creator",
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      couple: {
        _id: coupleId,
        name: args.name,
        inviteCode,
        anniversary: args.anniversary ?? null,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      },
      membership: {
        _id: membershipId,
        userId: user._id,
        coupleId,
        role: "creator" as const,
        status: "active" as const,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      inviteCode,
    };
  },
});

export const joinCoupleByInviteCode = mutationGeneric({
  args: {
    inviteCode: v.string(),
  },
  returns: v.object({
    couple: coupleRecordValidator,
    membership: membershipRecordValidator,
    memberCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const db = ctx.db as LooseDb;
    const user = await upsertCurrentUser(ctx);
    const currentCouple = await resolveActiveCoupleForUser(ctx, user._id);
    if (currentCouple) {
      throw new ConvexError("You already belong to a couple.");
    }

    const couple = await findCoupleByInviteCode(db, args.inviteCode);
    if (!couple || !couple.inviteCode) {
      throw new ConvexError("That invite code is invalid or has already been used.");
    }

    const activeMembers = await listActiveMembershipsForCouple(ctx, couple._id);
    if (activeMembers.length >= 2) {
      throw new ConvexError("That invite code is invalid or has already been used.");
    }

    const existingMembership = await getMembershipForUserAndCouple(
      ctx,
      user._id,
      couple._id,
    );
    if (existingMembership) {
      throw new ConvexError("You already belong to this couple.");
    }

    const now = Date.now();
    await db.patch(couple._id, {
      inviteCode: null,
      updatedAt: now,
    });

    const membershipId = await db.insert("memberships", {
      userId: user._id,
      coupleId: couple._id,
      role: "partner",
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      couple: toCoupleRecord(
        {
          ...couple,
          updatedAt: now,
        },
        null,
      ),
      membership: {
        _id: membershipId,
        userId: user._id,
        coupleId: couple._id,
        role: "partner" as const,
        status: "active" as const,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      memberCount: activeMembers.length + 1,
    };
  },
});

export const updateCouple = mutationGeneric({
  args: {
    name: v.optional(v.string()),
    anniversary: v.optional(v.union(v.string(), v.null())),
  },
  returns: coupleRecordValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as LooseDb;
    const session = await resolveCurrentSession(ctx);
    if (!session?.activeCouple) {
      throw new ConvexError("You don't have an active couple.");
    }

    const { couple } = session.activeCouple;
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.name !== undefined) patch.name = args.name;
    if (args.anniversary !== undefined) patch.anniversary = args.anniversary;

    await db.patch(couple._id, patch);

    return {
      ...couple,
      ...patch,
    } as CoupleRecord;
  },
});

export const leaveCouple = mutationGeneric({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const db = ctx.db as LooseDb;
    const session = await resolveCurrentSession(ctx);
    if (!session?.activeCouple) {
      throw new ConvexError("You don't have an active couple.");
    }

    const { membership } = session.activeCouple;
    const now = Date.now();
    await db.patch(membership._id, {
      status: "left",
      updatedAt: now,
    });

    return null;
  },
});

export const getActiveCouple = queryGeneric({
  args: {},
  returns: v.union(v.null(), activeCoupleSummaryValidator),
  handler: async (ctx) => {
    const session = await resolveCurrentSession(ctx);
    return session?.activeCouple ?? null;
  },
});

export const getPartnerPresenceSummary = queryGeneric({
  args: {},
  returns: presenceSummaryValidator,
  handler: async (ctx) => {
    const session = await resolveCurrentSession(ctx);
    if (!session?.profile || !session.activeCouple) {
      return null;
    }

    const { couple, membership, memberCount, partner } = session.activeCouple;
    const relationshipState: "paired" | "waiting" = partner ? "paired" : "waiting";
    return {
      coupleId: couple._id,
      coupleName: couple.name,
      memberCount,
      relationshipState,
      self: {
        userId: session.profile._id,
        displayName: session.profile.displayName,
        avatarUrl: session.profile.avatarUrl ?? null,
      },
      partner: partner
        ? {
            userId: partner._id,
            displayName: partner.displayName,
            avatarUrl: partner.avatarUrl ?? null,
          }
        : null,
      joinedAt: membership.joinedAt,
    };
  },
});
