import { ConvexError, v } from "convex/values";

export type SessionIdentity = {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

export type SessionUser = {
  _id: string;
  authSubject: string;
  authIssuer: string;
  tokenIdentifier: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  preferences: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

export type CoupleRecord = {
  _id: string;
  name: string;
  inviteCode: string | null;
  anniversary: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type MembershipRecord = {
  _id: string;
  userId: string;
  coupleId: string;
  role: "creator" | "partner";
  status: "active" | "left";
  joinedAt: number;
  createdAt: number;
  updatedAt: number;
};

export type AppSession = {
  identity: SessionIdentity;
  profile: SessionUser | null;
  activeCouple: ActiveCoupleSummary | null;
};

export type ActiveCoupleSummary = {
  couple: CoupleRecord;
  membership: MembershipRecord;
  memberCount: number;
  partner: SessionUser | null;
};

type QueryCtx = {
  auth: {
    getUserIdentity(): Promise<any>;
  };
  db: any;
};

type MutationCtx = QueryCtx & {
  db: any;
};

function toDisplayName(identity: SessionIdentity) {
  return (
    identity.name ??
    identity.email?.split("@")[0] ??
    "Coupl user"
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSessionUser(doc: SessionUser | null): SessionUser | null {
  if (!doc) {
    return null;
  }

  return {
    _id: doc._id,
    authSubject: doc.authSubject,
    authIssuer: doc.authIssuer,
    tokenIdentifier: doc.tokenIdentifier,
    ...(doc.email !== undefined ? { email: doc.email } : {}),
    displayName: doc.displayName,
    ...(doc.avatarUrl !== undefined ? { avatarUrl: doc.avatarUrl } : {}),
    preferences: clone(doc.preferences),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toCoupleRecord(doc: CoupleRecord): CoupleRecord {
  return {
    _id: doc._id,
    name: doc.name,
    inviteCode: doc.inviteCode,
    anniversary: doc.anniversary,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toMembershipRecord(doc: MembershipRecord): MembershipRecord {
  return {
    _id: doc._id,
    userId: doc.userId,
    coupleId: doc.coupleId,
    role: doc.role,
    status: doc.status,
    joinedAt: doc.joinedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const sessionIdentityValidator = v.object({
  tokenIdentifier: v.string(),
  subject: v.string(),
  issuer: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  pictureUrl: v.optional(v.string()),
});

export const userProfileValidator = v.object({
  _id: v.string(),
  authSubject: v.string(),
  authIssuer: v.string(),
  tokenIdentifier: v.string(),
  email: v.optional(v.string()),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  preferences: v.record(v.string(), v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const coupleRecordValidator = v.object({
  _id: v.string(),
  name: v.string(),
  inviteCode: v.union(v.string(), v.null()),
  anniversary: v.union(v.string(), v.null()),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const membershipRecordValidator = v.object({
  _id: v.string(),
  userId: v.string(),
  coupleId: v.string(),
  role: v.union(v.literal("creator"), v.literal("partner")),
  status: v.union(v.literal("active"), v.literal("left")),
  joinedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const activeCoupleSummaryValidator = v.object({
  couple: coupleRecordValidator,
  membership: membershipRecordValidator,
  memberCount: v.number(),
  partner: v.union(userProfileValidator, v.null()),
});

export const sessionValidator = v.object({
  identity: sessionIdentityValidator,
  profile: v.union(userProfileValidator, v.null()),
  activeCouple: v.union(activeCoupleSummaryValidator, v.null()),
});

export const presenceSummaryValidator = v.union(
  v.null(),
  v.object({
    coupleId: v.string(),
    coupleName: v.string(),
    memberCount: v.number(),
    relationshipState: v.union(v.literal("paired"), v.literal("waiting")),
    self: v.object({
      userId: v.string(),
      displayName: v.string(),
      avatarUrl: v.union(v.string(), v.null()),
    }),
    partner: v.union(
      v.object({
        userId: v.string(),
        displayName: v.string(),
        avatarUrl: v.union(v.string(), v.null()),
      }),
      v.null(),
    ),
    joinedAt: v.number(),
  }),
);

export async function getCurrentIdentity(
  ctx: QueryCtx,
): Promise<SessionIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const identityResult = {
    tokenIdentifier: identity.tokenIdentifier,
    subject: identity.subject,
    issuer: identity.issuer,
    ...(identity.email !== undefined ? { email: identity.email } : {}),
    ...(identity.name !== undefined ? { name: identity.name } : {}),
    ...(identity.pictureUrl !== undefined ? { pictureUrl: identity.pictureUrl } : {}),
  } satisfies SessionIdentity;
  return identityResult;
}

export async function getCurrentUser(ctx: QueryCtx): Promise<SessionUser | null> {
  const identity = await getCurrentIdentity(ctx);
  if (!identity) {
    return null;
  }
  return (await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique()) as SessionUser | null;
}

export async function requireCurrentIdentity(ctx: QueryCtx) {
  const identity = await getCurrentIdentity(ctx);
  if (!identity) {
    throw new ConvexError("Authentication required.");
  }
  return identity;
}

export async function requireCurrentUser(ctx: QueryCtx) {
  const identity = await requireCurrentIdentity(ctx);
  const user = await getCurrentUser(ctx);
  return { identity, user };
}

export async function upsertCurrentUser(
  ctx: MutationCtx,
  input: {
    displayName?: string;
    avatarUrl?: string;
    preferences?: Record<string, unknown>;
  } = {},
): Promise<SessionUser> {
  const identity = await requireCurrentIdentity(ctx);
  const existing = (await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique()) as SessionUser | null;
  const now = Date.now();
  const avatarUrl = input.avatarUrl ?? existing?.avatarUrl ?? identity.pictureUrl;
  const nextUserBase = {
    authSubject: identity.subject,
    authIssuer: identity.issuer,
    tokenIdentifier: identity.tokenIdentifier,
    displayName: input.displayName ?? existing?.displayName ?? toDisplayName(identity),
    preferences: input.preferences ?? existing?.preferences ?? {},
    updatedAt: now,
  };
  const nextUser = {
    ...nextUserBase,
    ...(identity.email !== undefined ? { email: identity.email } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
  };

  if (existing) {
    await ctx.db.patch(existing._id, nextUser);
    return {
      ...existing,
      ...nextUser,
    };
  }

  const _id = await ctx.db.insert("users", {
    ...nextUser,
    createdAt: now,
  });

  return {
    _id,
    ...nextUser,
    createdAt: now,
  };
}

export async function resolveActiveCoupleForUser(
  ctx: QueryCtx,
  userId: string,
): Promise<ActiveCoupleSummary | null> {
  const memberships = (await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .collect()) as MembershipRecord[];
  const activeMembership = memberships.find(
    (membership) => membership.status === "active",
  );
  if (!activeMembership) {
    return null;
  }

  const couple = (await ctx.db.get(activeMembership.coupleId)) as CoupleRecord | null;
  if (!couple) {
    return null;
  }

  const coupleMemberships = (await ctx.db
    .query("memberships")
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", activeMembership.coupleId))
    .collect()) as MembershipRecord[];
  const activeCoupleMemberships = coupleMemberships.filter(
    (membership) => membership.status === "active",
  );
  const partnerMembership = activeCoupleMemberships.find(
    (membership) => membership.userId !== userId,
  );
  const partner = partnerMembership
    ? ((await ctx.db.get(partnerMembership.userId)) as SessionUser | null)
    : null;

  return {
    couple: toCoupleRecord(couple),
    membership: toMembershipRecord(activeMembership),
    memberCount: activeCoupleMemberships.length,
    partner: toSessionUser(partner),
  };
}

export async function resolveCurrentSession(ctx: QueryCtx): Promise<AppSession | null> {
  const identity = await getCurrentIdentity(ctx);
  if (!identity) {
    return null;
  }
  const profile = await getCurrentUser(ctx);
  const activeCouple = profile
    ? await resolveActiveCoupleForUser(ctx, profile._id)
    : null;
  return {
    identity,
    profile: toSessionUser(profile),
    activeCouple,
  };
}

export function deriveInviteCode(existingCodes: string[]) {
  let code = "";
  do {
    const raw =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    code = raw.replace(/-/g, "").slice(0, 8).toUpperCase();
  } while (existingCodes.includes(code));
  return code;
}

export function sanitizePreferences(preferences?: Record<string, unknown>) {
  return clone(preferences ?? {});
}
