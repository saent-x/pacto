import type { ActiveCoupleSummary, MembershipRecord } from "./lib/auth";

type QueryCtx = {
  db: any;
};

export async function listActiveMembershipsForCouple(
  ctx: QueryCtx,
  coupleId: string,
): Promise<MembershipRecord[]> {
  const memberships = (await ctx.db
    .query("memberships")
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
    .collect()) as MembershipRecord[];
  return memberships.filter((membership) => membership.status === "active");
}

export async function getMembershipForUserAndCouple(
  ctx: QueryCtx,
  userId: string,
  coupleId: string,
): Promise<MembershipRecord | null> {
  const memberships = (await ctx.db
    .query("memberships")
    .withIndex("by_userId_coupleId", (q: any) =>
      q.eq("userId", userId).eq("coupleId", coupleId),
    )
    .collect()) as MembershipRecord[];
  const membership = memberships
    .sort(
      (left, right) =>
        right.updatedAt - left.updatedAt || left._id.localeCompare(right._id),
    )
    .find((item) => item.status === "active");
  return membership ?? null;
}

export async function listMembershipsForUserAndCouple(
  ctx: QueryCtx,
  userId: string,
  coupleId: string,
): Promise<MembershipRecord[]> {
  const memberships = (await ctx.db
    .query("memberships")
    .withIndex("by_userId_coupleId", (q: any) =>
      q.eq("userId", userId).eq("coupleId", coupleId),
    )
    .collect()) as MembershipRecord[];
  return memberships.sort(
    (left, right) =>
      right.updatedAt - left.updatedAt || left._id.localeCompare(right._id),
  );
}

export function buildActiveCoupleSummary(
  input: Omit<ActiveCoupleSummary, "memberCount" | "partner"> & {
    memberCount: number;
    partner: ActiveCoupleSummary["partner"];
  },
): ActiveCoupleSummary {
  return {
    couple: input.couple,
    membership: input.membership,
    memberCount: input.memberCount,
    partner: input.partner,
  };
}
